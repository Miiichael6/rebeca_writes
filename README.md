# RebeccaWrites

App de escritorio para Windows que transcribe video y audio a texto 100 % en local con [whisper.cpp](https://github.com/ggml-org/whisper.cpp). Electron + React 19 + TypeScript (electron-vite). Spec completa en [plans/about_this_project.md](plans/about_this_project.md).

## Requisitos de desarrollo

- Windows 10/11 x64
- [Node.js](https://nodejs.org/) 20 o superior y npm
- [Git](https://git-scm.com/)
- Editor recomendado: VSCode + ESLint + Prettier

## Puesta en marcha

```bash
$ npm install
$ npm run fetch:bin -- --only=cpu   # binarios de whisper.cpp (ver abajo)
$ npm run dev
```

### Binarios de whisper.cpp

Los ejecutables no se versionan. Después de `npm install`:

```bash
$ npm run fetch:bin                # CPU y CUDA 12 de la release fijada en el script
$ npm run fetch:bin -- --latest    # la release más reciente que publique ambos zips
$ npm run fetch:bin -- --only=cpu  # solo CPU (~11 MB; CUDA pesa ~1,1 GB)
```

Quedan en `resources/bin/{cpu,cuda}/` (`whisper-cli.exe` + DLLs + `.version`). Además copia desde `System32` el runtime de Visual C++ (`msvcp140`, `vcruntime140`, `vcruntime140_1`, `vcomp140`), porque sin él `whisper-cli` no arranca en un Windows limpio. Para eso, la máquina de build necesita el [Visual C++ Redistributable x64](https://aka.ms/vs/17/release/vc_redist.x64.exe). El script es idempotente: si la versión instalada coincide no descarga nada (`--force` para forzar). Si la API de GitHub limita las peticiones, define `GITHUB_TOKEN`.

#### Build Vulkan

whisper.cpp no publica una build Vulkan para Windows x64, así que se compila a mano. Requisitos: Visual Studio 2022 con "Desarrollo para el escritorio con C++", CMake y el [Vulkan SDK](https://vulkan.lunarg.com/sdk/home#windows).

```bash
$ git clone https://github.com/ggml-org/whisper.cpp
$ cd whisper.cpp
$ git checkout b5130   # la misma versión que WHISPER_RELEASE en scripts/fetch-binaries.mjs
$ cmake -B build -DGGML_VULKAN=1 -DGGML_BACKEND_DL=ON -DGGML_CPU_ALL_VARIANTS=ON -DWHISPER_BUILD_TESTS=OFF
$ cmake --build build --config Release -j
```

Copia `build/bin/Release/whisper-cli.exe` y todas las `*.dll` de esa carpeta a `resources/bin/vulkan/`. Para comprobarla, `resources/bin/vulkan/whisper-cli.exe --help` debe mostrar `Found N Vulkan devices` y `loaded Vulkan backend`, que es lo que mira la autodetección.

### Desarrollo

```bash
$ npm run dev         # electron-vite con HMR
$ npm run typecheck   # tsc (main/preload y renderer)
$ npm run lint
$ npm run test        # vitest run
```

## Generar el instalador

```bash
$ npm run build:win
```

Vacía `dist/` (salvo los `.wsb`; `npm run clean:dist`) y deja `dist/RebeccaWrites-Setup-<versión>.exe` (NSIS, x64, con selección de carpeta, accesos directos y asociaciones de archivo). Antes de empaquetar, `prebuild:win` comprueba que exista `resources/bin/cpu/whisper-cli.exe` y falla con un mensaje claro si falta (`npm run fetch:bin`). `npm run build` solo compila (typecheck + electron-vite) a `out/`. `npm run build:unpack` genera la carpeta `dist/win-unpacked` sin instalador.

- El backend **CUDA no va en el instalador** (pesa ~1,1 GB): `resources/bin/cuda` se excluye del paquete y la app lo descargará aparte. Con solo CPU el instalador pesa ~130 MB.
- Los binarios (`whisper-cli`, ffmpeg, ffprobe) se ejecutan desde `app.asar.unpacked`.
- Si en tu shell existe `ELECTRON_RUN_AS_NODE=1` (p. ej. terminales de algunos editores), el `.exe` se comporta como Node y no abre ventana: quítala antes de probarlo.

## Publicar una versión

Las versiones se publican en [GitHub Releases](https://github.com/Miiichael6/rebeca_writes/releases) y la app instalada se actualiza sola con un clic (`electron-updater`).

### Antes de empezar

- `gh auth status` debe mostrar la sesión iniciada con permiso `repo`. Si no, `gh auth login`.
- El árbol de trabajo debe estar limpio: todo lo que va en la versión, ya en un commit.

### Pasos (PowerShell, todos en la misma terminal)

```powershell
# 1. Subir la versión: edita package.json, hace commit y crea el tag vX.Y.Z
npm version patch        # arreglos: 1.1.1 → 1.1.2
# npm version minor      # funciones nuevas: 1.1.1 → 1.2.0

# 2. Subir commit y tag
git push; git push --tags

# 3. Crear el borrador del Release ANTES de compilar (evita borradores duplicados, ver abajo)
$v = (node -p "require('./package.json').version")
gh release create "v$v" --draft --title $v --notes "Novedades de la $v"

# 4. Compilar y subir el .exe, el .blockmap y latest.yml a ese borrador
$env:GH_TOKEN = (gh auth token)
npm run release
```

En Git Bash, los pasos 3 y 4 son:

```bash
v=$(node -p "require('./package.json').version")
gh release create "v$v" --draft --title "$v" --notes "Novedades de la $v"
export GH_TOKEN=$(gh auth token)
npm run release
```

`gh auth token` saca el token de la sesión de `gh`, así que no hay que pegar ninguno. El token nunca se guarda en archivos del repo.

5. **Revisar y publicar.** En [Releases](https://github.com/Miiichael6/rebeca_writes/releases), abre el borrador `vX.Y.Z`. Debe tener **un solo** borrador con estos tres archivos:
   - `RebeccaWrites-Setup-X.Y.Z.exe`
   - `RebeccaWrites-Setup-X.Y.Z.exe.blockmap`
   - `latest.yml`

   Escribe las notas (la app las muestra como notas de la versión) y pulsa **Publish release**.

6. **Comprobar** que GitHub la da como la última:

   ```powershell
   gh api repos/Miiichael6/rebeca_writes/releases/latest --jq .tag_name
   ```

Las apps instaladas la detectan al arrancar (como mucho una vez cada 6 h) o con **Configuración › Acerca de → Buscar actualizaciones**. Luego se pulsa **Actualizar** y después **Reiniciar**.

### Problemas conocidos

- **`GitHub Personal Access Token is not set`**: falta `$env:GH_TOKEN = (gh auth token)` en esa terminal. La variable se pierde al cerrarla. El instalador ya quedó en `dist/`; basta con repetir el paso 4.
- **Dos borradores con el mismo tag**: si el borrador no existe antes de `npm run release`, `electron-builder` puede crear dos y repartir los archivos entre ellos. Para arreglarlo:
  1. Borra el que solo tiene el `.blockmap`.
  2. En el otro, **Edit** → arrastra `dist\RebeccaWrites-Setup-X.Y.Z.exe.blockmap` desde el Explorador de Windows.
  3. Comprueba que el adjunto termine en `.blockmap`: si termina en `.url` es un acceso directo, bórralo y súbelo de nuevo.
- **No repitas `npm run release` con la misma versión**: vuelve a subir los archivos y puede duplicar borradores. Si hay que recompilar, sube la versión (`npm version patch`).
- **Sin `.blockmap`** la actualización funciona igual, pero descarga el instalador completo (~130 MB) en vez de solo lo que cambió.
- **Si `latest.yml` no corresponde a ese `.exe`**, la app descarta la descarga. Nunca mezcles archivos de dos compilaciones distintas en un Release.

Un tag ya publicado no se mueve: si una versión sale con un fallo, se publica `X.Y.Z+1`.

La `v1.0.0` no trae el actualizador; la primera versión con él (`v1.1.0`) se instala a mano. Para probar el flujo sin publicar, ver el paso 7 de `plans/tasks/in_progress/25_actualizaciones_automaticas.md`.

## Estructura

| Carpeta          | Contenido                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/main/`      | Proceso principal: motor de transcripción, servicios (ffmpeg, cola, historial, modelos, ajustes), protocolo `media://` |
| `src/preload/`   | `window.api` tipada vía `contextBridge`                                                                                |
| `src/renderer/`  | UI React (Zustand, i18next, CSS con tokens)                                                                            |
| `src/shared/`    | Tipos, canales IPC y constantes compartidas                                                                            |
| `resources/bin/` | Binarios de whisper.cpp por backend (no versionados)                                                                   |
| `scripts/`       | `fetch-binaries`, `check-binaries`, iconos, licencias                                                                  |
| `plans/`         | Spec y tareas                                                                                                          |

El nombre de la app sale de una única constante: `APP_NAME` en [src/shared/app.ts](src/shared/app.ts). Para el nombre del instalador, ejecutable y accesos directos cambia también `productName` en `package.json` y `electron-builder.yml`.

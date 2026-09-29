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

Deja `dist/RebeccaWrites-Setup-<versión>.exe` (NSIS, x64, con selección de carpeta, accesos directos y asociaciones de archivo). Antes de empaquetar, `prebuild:win` comprueba que exista `resources/bin/cpu/whisper-cli.exe` y falla con un mensaje claro si falta (`npm run fetch:bin`). `npm run build` solo compila (typecheck + electron-vite) a `out/`. `npm run build:unpack` genera la carpeta `dist/win-unpacked` sin instalador.

- El backend **CUDA no va en el instalador** (pesa ~1,1 GB): `resources/bin/cuda` se excluye del paquete y la app lo descargará aparte. Con solo CPU el instalador pesa ~130 MB.
- Los binarios (`whisper-cli`, ffmpeg, ffprobe) se ejecutan desde `app.asar.unpacked`.
- Si en tu shell existe `ELECTRON_RUN_AS_NODE=1` (p. ej. terminales de algunos editores), el `.exe` se comporta como Node y no abre ventana: quítala antes de probarlo.

## Publicar una versión

Las versiones se publican en [GitHub Releases](https://github.com/Miiichael6/rebeca_writes/releases) y la app instalada se actualiza sola con un clic (`electron-updater`).

1. `npm version minor` (o `patch`): sube `package.json` y crea el tag `vX.Y.Z`.
2. `git push && git push --tags`.
3. `$env:GH_TOKEN = '…'; npm run release`: compila y sube el `.exe`, el `.blockmap` y `latest.yml` como **borrador**. El token es *fine-grained* con permiso `Contents: write` sobre este repo; nunca se guarda en el repo.
4. En GitHub → Releases: revisar el borrador, escribir las notas y pulsar **Publish**.

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

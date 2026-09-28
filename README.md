# mi-app

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Binarios de whisper.cpp

Los ejecutables no se versionan. Después de `npm install`:

```bash
$ npm run fetch:bin                # CPU y CUDA 12 de la release fijada en el script
$ npm run fetch:bin -- --latest    # la release más reciente que publique ambos zips
$ npm run fetch:bin -- --only=cpu  # solo CPU (~11 MB; CUDA pesa ~1,1 GB)
```

Quedan en `resources/bin/{cpu,cuda}/` (`whisper-cli.exe` + DLLs + `.version`). El script es idempotente: si la versión instalada coincide no descarga nada (`--force` para forzar). Si la API de GitHub limita las peticiones, define `GITHUB_TOKEN`.

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

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

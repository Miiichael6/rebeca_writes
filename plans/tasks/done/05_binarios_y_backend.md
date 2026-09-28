# 05 · Binarios whisper.cpp y detección de backend

**Estado:** ✅ Terminada (salvo el último punto del paso 6, que espera a D2)
**Fase:** 2 — Motor · **Depende de:** 01 · **Doc:** §2.1 · **Bloqueada por:** D2 (solo el paso 6)

## Objetivo
Tener whisper-cli para CUDA, Vulkan y CPU, elegir automáticamente el mejor backend y caer al siguiente si uno falla.

## Pasos

### Paso 1 — Script de descarga
- [x] `scripts/fetch-binaries.mjs`: consultar la API de releases de `ggml-org/whisper.cpp`
- [x] Descargar los zip de Windows x64 para **CPU** y **CUDA 12**
- [x] Descomprimir en `resources/bin/cpu/` y `resources/bin/cuda/` (exe + DLLs)
- [x] Idempotente: no volver a descargar si la versión ya está
- [x] Script `"fetch:bin": "node scripts/fetch-binaries.mjs"` en `package.json`

### Paso 2 — Vulkan
- [x] Revisar si la release publica una build Vulkan para Windows
- [x] Si existe → incluirla en el script
- [x] Si no → documentar en README: `cmake -B build -DGGML_VULKAN=1` + `cmake --build build --config Release` y copiar a `resources/bin/vulkan/`

### Paso 3 — Spike de streaming ⚠ (hacerlo antes que todo lo demás)
- [x] Ejecutar `whisper-cli` desde Node con `spawn` y stdout en pipe
- [x] Confirmar que los segmentos llegan **uno a uno** y no todos al final (buffering)
- [x] Confirmar la codificación UTF-8 de acentos y ñ en la salida
- [x] Si hay buffering: evaluar alternativas (otra versión, flags, build propia con `fflush`) y anotarlo en la bitácora

### Paso 4 — Resolución de rutas
- [x] `src/main/engine/paths.ts`: en dev `resources/bin/...`, en producción `process.resourcesPath/app.asar.unpacked/...`
- [x] Función `getWhisperCli(backend)` que valida que el exe existe

### Paso 5 — Autodetección
- [x] `src/main/engine/backend.ts`
- [x] Ejecutar `nvidia-smi` con timeout de 3 s → si responde, CUDA
- [x] Si no: probar Vulkan (ejecutar el exe con un modelo pequeño / `--help` y revisar el código de salida)
- [x] Si no: CPU
- [x] Guardar `detectedBackend` y `backend` en settings al primer arranque

### Paso 6 — Fallback
- [x] Detectar fallos al cargar: exit code distinto de 0 en los primeros segundos, DLL faltante o sin VRAM en stderr
- [x] Reintentar con el siguiente backend (CUDA → Vulkan → CPU)
- [x] Emitir evento para un toast no bloqueante ("CUDA no disponible, se usó CPU")
- [ ] Si D2 = CUDA descargable: gestor de descarga del paquete CUDA (reutiliza la lógica de la tarea 06) ⛔ D2

### Paso 7 — Verificación
- [x] Probar en una PC con NVIDIA y forzar CPU desde el código
- [x] Commit: `feat(engine): binarios y detección de backend`

## Criterios de aceptación
- [x] `npm run fetch:bin` deja binarios funcionales
- [x] La autodetección elige CUDA con NVIDIA y CPU sin ella
- [x] El spike de streaming está resuelto y documentado

## Bitácora
- 2026-09-27 — **Releases:** los tags `vX.Y.Z` (p. ej. `v1.9.4`) salen **sin binarios**; los zips se publican en el tag de build hermano (`b5130`). El script fija `WHISPER_RELEASE = 'b5130'`; `--latest` toma la release más reciente que traiga CPU y CUDA. Zips: `whisper-bin-x64.zip` (CPU, 8 MB) y `whisper-cublas-12.4.0-bin-x64.zip` (643 MB). Otros flags: `--force`, `--only=cpu,cuda`.
- 2026-09-27 — Del zip solo se copia `whisper-cli.exe` + DLLs, sin `SDL2`, `llama`, `parakeet` ni `nvblas64_12` (comprobado que whisper-cli arranca sin ellas). Se extrae con `%SystemRoot%\System32\tar.exe` (bsdtar), porque el `tar` de Git Bash es GNU y no abre zips. Cada carpeta lleva un `.version` para la idempotencia y se reemplaza entera al final (no queda a medias si falla).
- 2026-09-27 — **Tamaño:** `resources/bin/cuda` pesa **~1,1 GB** en disco (`ggml-cuda.dll` 545 MB + `cublasLt64_12.dll` 474 MB + `cublas64_12.dll` 100 MB); CPU, 11 MB. Dato para decidir **D2**.
- 2026-09-27 — **Vulkan:** ninguna release publica build Vulkan para Windows x64 (solo `opencl-adreno-arm64`). Documentado en README → "Build Vulkan". El script la descargará solo si algún día aparece `whisper-vulkan-bin-x64.zip`. La detección de Vulkan no se probó con un binario real.
- 2026-09-27 — **Spike de streaming (resuelto, sin buffering):** con `spawn` y stdout en pipe, en CPU (tiny, 90 s de audio TTS en español) los segmentos llegan en tandas a los 1,8 s, 3,4 s, 5,3 s y 5,7 s, no al final. Las tandas son la ventana de 30 s de whisper (decodifica 30 s y emite sus segmentos juntos), no buffering de stdio, así que no hace falta build propia ni `fflush`. En CUDA el primer segmento sale a 1,5 s. `progress = N%` sale por stderr intercalado con los segmentos. Acentos, ñ, `¿` salen bien en UTF-8. Para la 08: decodificar stdout con `StringDecoder`/`setEncoding('utf8')` para no partir un carácter multibyte entre dos chunks.
- 2026-09-27 — **Hallazgo clave para el fallback:** los zips cargan los backends como DLL en tiempo de ejecución. Sin GPU usable, el exe de CUDA **no falla**: imprime `ggml_cuda_init: failed to initialize CUDA` / `whisper_backend_init_gpu: no GPU found` y transcribe en CPU con exit 0. Por eso la detección lee stderr y no solo el exit code.
- 2026-09-27 — Autodetección (`engine/backend.ts`): `nvidia-smi -L` (3 s) y además `whisper-cli --help` del backend, que ya carga las DLL y enumera dispositivos (`found N CUDA devices` / `Found N Vulkan devices`) sin necesitar modelo. Solo considera backends instalados. Tarda ~0,5 s y corre en segundo plano al arrancar; `backend:get-info` (`window.api.backend.getInfo()`) la espera y devuelve `{ backend, detected, installed }` para Configuración (tarea 21). Si D2 = descargable, habrá que distinguir "hardware NVIDIA" de "CUDA instalado".
- 2026-09-27 — Settings: `services/settings.ts` es una versión **mínima** (leer + fusionar + escribir temporal + rename) solo para `detectedBackend`/`backend`. La tarea 12 la reemplaza con el tipo `Settings` completo y respeta esas dos claves.
- 2026-09-27 — Fallback (`engine/fallback.ts`, puro y con tests): `detectLoadFailure()` clasifica `missing-dll` (NTSTATUS `0xC0000135`/`0xC0000139`), `out-of-memory`, `no-device` y `crashed` (exit ≠ 0 en los primeros 10 s sin segmentos); los errores de modelo o audio no cuentan. `withBackendFallback()` baja por CUDA → Vulkan → CPU (solo instalados) y avisa por `onFallback`; `notifyFallback()` manda `backend:fallback` y el renderer muestra el toast traducido (`backend.fallback`, 5 s). **Falta enchufarlo en la 08**: el intento debe lanzar `BackendLoadError` (matando el proceso si `detectLoadFailure` da motivo mientras corre). El toast no se vio en pantalla porque aún no hay motor que lo dispare.
- 2026-09-27 — Verificado en `npm run dev` con RTX 3050: primer arranque → `settings.json` con `cuda`/`cuda`. Con `CUDA_VISIBLE_DEVICES=-1` (nvidia-smi responde pero CUDA no ve GPU) → `cpu`/`cpu`. Para lanzar desde la terminal de VS Code hay que quitar `ELECTRON_RUN_AS_NODE` (ver bitácora de la 04).

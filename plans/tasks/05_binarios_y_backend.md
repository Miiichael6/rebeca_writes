# 05 · Binarios whisper.cpp y detección de backend

**Estado:** ⬜ Pendiente
**Fase:** 2 — Motor · **Depende de:** 01 · **Doc:** §2.1 · **Bloqueada por:** D2 (solo el paso 6)

## Objetivo
Tener whisper-cli para CUDA, Vulkan y CPU, elegir automáticamente el mejor backend y caer al siguiente si uno falla.

## Pasos

### Paso 1 — Script de descarga
- [ ] `scripts/fetch-binaries.mjs`: consultar la API de releases de `ggml-org/whisper.cpp`
- [ ] Descargar los zip de Windows x64 para **CPU** y **CUDA 12**
- [ ] Descomprimir en `resources/bin/cpu/` y `resources/bin/cuda/` (exe + DLLs)
- [ ] Idempotente: no volver a descargar si la versión ya está
- [ ] Script `"fetch:bin": "node scripts/fetch-binaries.mjs"` en `package.json`

### Paso 2 — Vulkan
- [ ] Revisar si la release publica una build Vulkan para Windows
- [ ] Si existe → incluirla en el script
- [ ] Si no → documentar en README: `cmake -B build -DGGML_VULKAN=1` + `cmake --build build --config Release` y copiar a `resources/bin/vulkan/`

### Paso 3 — Spike de streaming ⚠ (hacerlo antes que todo lo demás)
- [ ] Ejecutar `whisper-cli` desde Node con `spawn` y stdout en pipe
- [ ] Confirmar que los segmentos llegan **uno a uno** y no todos al final (buffering)
- [ ] Confirmar la codificación UTF-8 de acentos y ñ en la salida
- [ ] Si hay buffering: evaluar alternativas (otra versión, flags, build propia con `fflush`) y anotarlo en la bitácora

### Paso 4 — Resolución de rutas
- [ ] `src/main/engine/paths.ts`: en dev `resources/bin/...`, en producción `process.resourcesPath/app.asar.unpacked/...`
- [ ] Función `getWhisperCli(backend)` que valida que el exe existe

### Paso 5 — Autodetección
- [ ] `src/main/engine/backend.ts`
- [ ] Ejecutar `nvidia-smi` con timeout de 3 s → si responde, CUDA
- [ ] Si no: probar Vulkan (ejecutar el exe con un modelo pequeño / `--help` y revisar el código de salida)
- [ ] Si no: CPU
- [ ] Guardar `detectedBackend` y `backend` en settings al primer arranque

### Paso 6 — Fallback
- [ ] Detectar fallos al cargar: exit code distinto de 0 en los primeros segundos, DLL faltante o sin VRAM en stderr
- [ ] Reintentar con el siguiente backend (CUDA → Vulkan → CPU)
- [ ] Emitir evento para un toast no bloqueante ("CUDA no disponible, se usó CPU")
- [ ] Si D2 = CUDA descargable: gestor de descarga del paquete CUDA (reutiliza la lógica de la tarea 06)

### Paso 7 — Verificación
- [ ] Probar en una PC con NVIDIA y forzar CPU desde el código
- [ ] Commit: `feat(engine): binarios y detección de backend`

## Criterios de aceptación
- [ ] `npm run fetch:bin` deja binarios funcionales
- [ ] La autodetección elige CUDA con NVIDIA y CPU sin ella
- [ ] El spike de streaming está resuelto y documentado

## Bitácora
- _(fecha — nota)_

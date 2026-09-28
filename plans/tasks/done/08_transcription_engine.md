# 08 · TranscriptionEngine y parsers

**Estado:** ✅ Terminada
**Fase:** 2 — Motor · **Depende de:** 05, 06, 07 · **Doc:** §2.3

## Objetivo
Una clase en el proceso principal que ejecuta el pipeline completo y emite segmentos en tiempo real.

## Pasos

### Paso 1 — Parsers (TDD)
- [x] `engine/parsers.ts` → `parseSegmentLine(line)`: `[hh:mm:ss.mmm --> hh:mm:ss.mmm]  texto` → `{ start, end, text }` en segundos
- [x] `parseProgress(line)`: `progress = N%` → número
- [x] `LineSplitter`: junta chunks y separa por `\n`/`\r\n` sin romper UTF-8 multibyte (`StringDecoder`)
- [x] Detectar idioma: línea `auto-detected language: xx`
- [x] Tests Vitest: líneas normales, acentos, texto vacío, tiempos > 1 h, chunks partidos, basura

### Paso 2 — Clase `TranscriptionEngine`
- [x] `EventEmitter` con eventos `segment`, `progress`, `done`, `error`
- [x] `start(job)` donde `job = { id, filePath, model, language, translate, audioTrack, options }`
- [x] Fases del progreso: preparando audio (0–5 %) → transcribiendo (5–100 %)

### Paso 3 — Pipeline
- [x] 1. `probe` (tarea 07)
- [x] 2. `toWav` con normalización según settings
- [x] 3. `spawn(whisper-cli, ['-m', model, '-f', wav, '-l', lang, '-pp', ...])`
- [x] Opciones: `--prompt`, `-ml`, `--suppress-nst`, `-tr`, `-t <hilos>`
- [x] 4. Parsear stdout/stderr en vivo
- [x] 5. `done` con todos los segmentos y el idioma detectado; borrar el WAV

### Paso 4 — Cancelación y errores
- [x] `cancel()`: `taskkill /PID <pid> /T /F` en Windows (`kill` en otros sistemas)
- [x] Limpiar la carpeta temporal siempre (`finally`)
- [x] Mapear errores a códigos: `MODEL_MISSING`, `BACKEND_FAILED`, `NO_AUDIO`, `NO_SPACE`, `CANCELLED`, `UNKNOWN`
- [x] Integrar el fallback de backend (tarea 05)

### Paso 5 — IPC
- [x] `transcribe:start`, `transcribe:cancel`
- [x] Eventos al renderer: `transcribe:segment`, `transcribe:progress`, `transcribe:done`, `transcribe:error`
- [x] Agrupar segmentos si llegan muy seguidos (cada ~100 ms) para no saturar el IPC

### Paso 6 — Verificación
- [x] Transcribir un audio real y ver los segmentos llegar uno a uno en el log
- [x] Cancelar a mitad: sin procesos huérfanos en el Administrador de tareas ni temporales
- [x] `npm run test` pasa
- [x] Commit: `feat(engine): TranscriptionEngine con streaming`
- [x] **Cierre de Fase 2**

## Criterios de aceptación
- [x] Los segmentos se emiten incrementalmente
- [x] Cancelar deja el sistema limpio
- [x] Los tests de los parsers pasan

## Bitácora
- 2026-09-27 — Parsers (`engine/parsers.ts`) sin import de `electron`, igual que `fallback.ts`: se pueden testear con Vitest sin mockear Electron. `LineSplitter` usa `StringDecoder('utf8')` para no romper acentos/ñ cuando un caracter multibyte queda partido entre dos chunks de stdout.
- 2026-09-27 — `TranscriptionEngine extends EventEmitter`: en vez de `declare interface X` fusionada con `class X` (patrón típico para tipar eventos), que ESLint rechaza aquí por `@typescript-eslint/no-unsafe-declaration-merging`, se usó un tipo `TranscriptionEngineEvents` (mapa evento → payload) más un `override on<K>()` y un `emitTyped<K>()` privado.
- 2026-09-27 — `ErrorCode` se amplió con `modelMissing`, `backendFailed`, `cancelled` (además de `noDiskSpace`, ya compartido con `ModelErrorCode`). Como las claves de traducción son tipadas a partir del JSON de i18n, hubo que agregar las tres claves nuevas en `errors.*` de `es.json`/`en.json`/`pt-BR.json` para que `tsc` no fallara en `QueuePanel.tsx`.
- 2026-09-27 — Segmentos agrupados en `transcribeManager.ts` con un buffer por `jobId` y un `setTimeout` de 100 ms (spec paso 5): evita mandar un IPC por línea de whisper-cli sin introducir un framework de colas.
- 2026-09-27 — Verificación (paso 6): igual que en la tarea 07, `TranscriptionEngine` depende de `electron` de forma transitiva (`services/models.ts`, `services/tempFiles.ts`, `engine/paths.ts`, `engine/backend.ts` usan `app`/`BrowserWindow`), así que no se automatiza con Vitest normal. En este entorno, además, `npm run dev` no puede abrir la ventana de Electron (el sandbox de la sesión fuerza `ELECTRON_RUN_AS_NODE=1`, así que `electron.app` llega `undefined`), así que en vez del hook temporal en `main/index.ts` de la tarea 07 se usó un test Vitest desechable con `vi.mock('electron', ...)` (solo `app.getPath`/`isPackaged`/`getAppPath` y `BrowserWindow.getAllWindows`) para correr el pipeline real (ffmpeg + whisper-cli, backend CUDA detectado, modelo `tiny`) contra un WAV sintético de 150 s generado con `ffmpeg -f lavfi -i sine=...`. Resultado: progreso 0→5 % (preparación) y 5→100 % (transcripción) en orden, segmentos emitidos uno a uno según llegan por stdout, `done` con `backend`/`language` correctos. Se probó `cancel()` en dos momentos — durante la conversión a WAV (aborta vía `AbortController`, error `cancelled`) y ya con whisper-cli corriendo (mata el árbol con `taskkill`, error `cancelled`) — y en ambos casos no quedaron procesos `whisper-cli.exe`/`ffmpeg.exe` huérfanos ni la carpeta `%TEMP%/transcriba/<jobId>/`. El test se borró después de usarlo, no queda en el repo.

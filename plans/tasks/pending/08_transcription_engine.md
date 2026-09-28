# 08 · TranscriptionEngine y parsers

**Estado:** ⬜ Pendiente
**Fase:** 2 — Motor · **Depende de:** 05, 06, 07 · **Doc:** §2.3

## Objetivo
Una clase en el proceso principal que ejecuta el pipeline completo y emite segmentos en tiempo real.

## Pasos

### Paso 1 — Parsers (TDD)
- [ ] `engine/parsers.ts` → `parseSegmentLine(line)`: `[hh:mm:ss.mmm --> hh:mm:ss.mmm]  texto` → `{ start, end, text }` en segundos
- [ ] `parseProgress(line)`: `progress = N%` → número
- [ ] `LineSplitter`: junta chunks y separa por `\n`/`\r\n` sin romper UTF-8 multibyte (`StringDecoder`)
- [ ] Detectar idioma: línea `auto-detected language: xx`
- [ ] Tests Vitest: líneas normales, acentos, texto vacío, tiempos > 1 h, chunks partidos, basura

### Paso 2 — Clase `TranscriptionEngine`
- [ ] `EventEmitter` con eventos `segment`, `progress`, `done`, `error`
- [ ] `start(job)` donde `job = { id, filePath, model, language, translate, audioTrack, options }`
- [ ] Fases del progreso: preparando audio (0–5 %) → transcribiendo (5–100 %)

### Paso 3 — Pipeline
- [ ] 1. `probe` (tarea 07)
- [ ] 2. `toWav` con normalización según settings
- [ ] 3. `spawn(whisper-cli, ['-m', model, '-f', wav, '-l', lang, '-pp', ...])`
- [ ] Opciones: `--prompt`, `-ml`, `--suppress-nst`, `-tr`, `-t <hilos>`
- [ ] 4. Parsear stdout/stderr en vivo
- [ ] 5. `done` con todos los segmentos y el idioma detectado; borrar el WAV

### Paso 4 — Cancelación y errores
- [ ] `cancel()`: `taskkill /PID <pid> /T /F` en Windows (`kill` en otros sistemas)
- [ ] Limpiar la carpeta temporal siempre (`finally`)
- [ ] Mapear errores a códigos: `MODEL_MISSING`, `BACKEND_FAILED`, `NO_AUDIO`, `NO_SPACE`, `CANCELLED`, `UNKNOWN`
- [ ] Integrar el fallback de backend (tarea 05)

### Paso 5 — IPC
- [ ] `transcribe:start`, `transcribe:cancel`
- [ ] Eventos al renderer: `transcribe:segment`, `transcribe:progress`, `transcribe:done`, `transcribe:error`
- [ ] Agrupar segmentos si llegan muy seguidos (cada ~100 ms) para no saturar el IPC

### Paso 6 — Verificación
- [ ] Transcribir un audio real de 2–3 min y ver los segmentos llegar uno a uno en el log
- [ ] Cancelar a mitad: sin procesos huérfanos en el Administrador de tareas ni temporales
- [ ] `npm run test` pasa
- [ ] Commit: `feat(engine): TranscriptionEngine con streaming`
- [ ] **Cierre de Fase 2**

## Criterios de aceptación
- [ ] Los segmentos se emiten incrementalmente
- [ ] Cancelar deja el sistema limpio
- [ ] Los tests de los parsers pasan

## Bitácora
- _(fecha — nota)_

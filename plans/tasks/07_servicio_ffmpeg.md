# 07 · Servicio ffmpeg / ffprobe

**Estado:** ⬜ Pendiente
**Fase:** 2 — Motor · **Depende de:** 01 · **Doc:** §2.3 pasos 1–2, §3

## Objetivo
Analizar cualquier archivo multimedia y convertirlo al WAV que necesita whisper.

## Pasos

### Paso 1 — Binarios
- [ ] Instalar `ffmpeg-static` y `ffprobe-static`
- [ ] Resolver rutas corrigiendo `app.asar` → `app.asar.unpacked` en producción
- [ ] Anotar la licencia de la build (GPL) para Reconocimientos (tarea 21)

### Paso 2 — Formatos admitidos
- [ ] `src/shared/formats.ts`: listas de video y audio de §3
- [ ] Filtros para el diálogo: Video, Audio, Todos los medios, Todos los archivos

### Paso 3 — `probe(file)`
- [ ] `ffprobe -v error -show_format -show_streams -of json`
- [ ] Devolver: duración, pistas de audio (índice, idioma, códec, canales), códec de video, contenedor
- [ ] `isChromiumPlayable`: contenedor y códec en lista blanca (mp4/webm/mkv con h264/vp8/vp9/av1 y aac/opus/mp3/vorbis)
- [ ] Error claro si no hay pista de audio

### Paso 4 — `toWav(file, opts)`
- [ ] `-i <file> -map 0:a:<track> -ar 16000 -ac 1 -c:a pcm_s16le <tmp>.wav`
- [ ] Con normalización: añadir `-af loudnorm`
- [ ] Progreso a partir de `-progress pipe:1` (`out_time_ms`)
- [ ] Carpeta temporal: `app.getPath('temp')/transcriba/<jobId>/`
- [ ] Cancelable (matar el proceso y borrar el temporal)

### Paso 5 — Tests
- [ ] Test del parser de la salida de ffprobe con JSON de ejemplo
- [ ] Test de `isChromiumPlayable`

### Paso 6 — Verificación
- [ ] Convertir mp4, mkv, mp3, un archivo con 2 pistas (elegir la 2) y un archivo sin audio (error)
- [ ] Commit: `feat(ffmpeg): probe y conversión a wav`

## Criterios de aceptación
- [ ] El WAV resultante es 16 kHz, mono, s16le
- [ ] El error sin audio es comprensible para el usuario

## Bitácora
- _(fecha — nota)_

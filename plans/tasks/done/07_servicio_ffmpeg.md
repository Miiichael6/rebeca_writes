# 07 · Servicio ffmpeg / ffprobe

**Estado:** ✅ Terminada
**Fase:** 2 — Motor · **Depende de:** 01 · **Doc:** §2.3 pasos 1–2, §3

## Objetivo
Analizar cualquier archivo multimedia y convertirlo al WAV que necesita whisper.

## Pasos

### Paso 1 — Binarios
- [x] Instalar `ffmpeg-static` y `ffprobe-static`
- [x] Resolver rutas corrigiendo `app.asar` → `app.asar.unpacked` en producción
- [x] Anotar la licencia de la build (GPL) para Reconocimientos (tarea 21)

### Paso 2 — Formatos admitidos
- [x] `src/shared/formats.ts`: listas de video y audio de §3
- [x] Filtros para el diálogo: Video, Audio, Todos los medios, Todos los archivos

### Paso 3 — `probe(file)`
- [x] `ffprobe -v error -show_format -show_streams -of json`
- [x] Devolver: duración, pistas de audio (índice, idioma, códec, canales), códec de video, contenedor
- [x] `isChromiumPlayable`: contenedor y códec en lista blanca (mp4/webm/mkv con h264/vp8/vp9/av1 y aac/opus/mp3/vorbis)
- [x] Error claro si no hay pista de audio

### Paso 4 — `toWav(file, opts)`
- [x] `-i <file> -map 0:a:<track> -ar 16000 -ac 1 -c:a pcm_s16le <tmp>.wav`
- [x] Con normalización: añadir `-af loudnorm`
- [x] Progreso a partir de `-progress pipe:1` (`out_time_ms`)
- [x] Carpeta temporal: `app.getPath('temp')/transcriba/<jobId>/`
- [x] Cancelable (matar el proceso y borrar el temporal)

### Paso 5 — Tests
- [x] Test del parser de la salida de ffprobe con JSON de ejemplo
- [x] Test de `isChromiumPlayable`

### Paso 6 — Verificación
- [x] Convertir mp4, mkv, mp3, un archivo con 2 pistas (elegir la 2) y un archivo sin audio (error)
- [x] Commit: `feat(ffmpeg): probe y conversión a wav`

## Criterios de aceptación
- [x] El WAV resultante es 16 kHz, mono, s16le
- [x] El error sin audio es comprensible para el usuario

## Bitácora
- 2026-09-27 — **Binarios:** `ffmpeg-static` 5.3 (ffmpeg 6.1.1 essentials de gyan.dev, 79 MB) y `ffprobe-static` 3.1 (ffprobe **4.0.2** de 2018, 61 MB; es lo que publica el paquete, basta para leer contenedores y códecs). Rutas en `services/ffmpeg.ts` con `unpackedPath()` (`app.asar` → `app.asar.unpacked`). En `electron-builder.yml`: `asarUnpack` de `node_modules/ffmpeg-static/**` y `node_modules/ffprobe-static/bin/**`, y se excluyen los ffprobe de macOS/Linux/ia32 del paquete.
- 2026-09-27 — **Licencia (para la 21):** ambas builds son `--enable-gpl --enable-version3` → **GPL v3**. ffmpeg: fuente https://github.com/FFmpeg/FFmpeg/commit/e38092ef93 (texto en `node_modules/ffmpeg-static/ffmpeg.exe.LICENSE`). ffprobe-static: MIT el paquete, el binario GPL v3.
- 2026-09-27 — **Formatos:** las listas pasan de `shared/media.ts` a `shared/formats.ts` (media.ts queda con `mediaKindOf`). `mediaFileFilters(label)` devuelve los filtros del diálogo en orden Todos los medios / Video / Audio / Todos los archivos; los nombres vienen de `fileFilters.*` en los tres locales (la 19 los conecta).
- 2026-09-27 — **`probe`** devuelve `MediaInfo` (tipo en `shared/types.ts`): duración (la del formato o, si falta, la del stream más largo), contenedor, códec de video (sin contar carátulas `attached_pic`), pistas de audio (`index` = posición para `-map 0:a:N`, idioma sin `und`, título, códec, canales) e `isChromiumPlayable`. Errores con código traducible: `noAudioStream`, `unreadableMedia` (ffprobe no lo lee) y `conversionFailed`; el stderr de ffmpeg solo va en `detail` para el log. Un `.txt` lo abre ffprobe como video `tty`, así que da `noAudioStream`.
- 2026-09-27 — **`isChromiumPlayable`** (en `shared/formats.ts`): contenedores mp4/mov, matroska/webm, ogg, mp3, wav, flac; video h264/vp8/vp9/av1; audio aac/opus/mp3/vorbis/flac/pcm_s16le/pcm_f32le (se mira la primera pista, que es la que suena). HEVC queda fuera a propósito aunque algunos equipos lo decodifiquen; la 11 le hace vista previa.
- 2026-09-27 — **`toWav`**: `-map 0:a:<pista> -vn -sn -dn [-af loudnorm] -ar 16000 -ac 1 -c:a pcm_s16le -progress pipe:1` a `<outDir>/audio.wav`. Progreso 0–100 desde `out_time_us`/`out_time_ms` (ambos en µs), con `progress=end` = 100. Cancelación por `AbortSignal`: mata ffmpeg, espera a `close` (Windows suelta el archivo) y borra `outDir`; también lo borra si falla. `services/ffmpeg.ts` no importa `electron`; la carpeta la da `services/tempFiles.ts` → `jobTempDir(jobId)` = `%TEMP%/transcriba/<jobId>` (nombre sacado de `APP_NAME`). Limpiar temporales huérfanos tras un cierre forzado queda para la 08/17.
- 2026-09-27 — **Tests** `tests/main/ffmpeg.test.ts` (33): parser con JSON real de ffprobe, `isChromiumPlayable`, parser de progreso con trozos partidos, rutas y argumentos, y con los binarios reales: mp4, mkv con 2 pistas, mp3, loudnorm, sin audio, archivo basura y cancelación (10 min con loudnorm, se corta al 1 % y la carpeta desaparece). Se comprueba la cabecera del WAV: PCM, 1 canal, 16000 Hz, 16 bits.
- 2026-09-27 — **Verificación real** con un bloque temporal en `main/index.ts` (ya quitado), en `electron .` y en el **build empaquetado** (`electron-builder --dir`): las rutas salen de `app.asar.unpacked` y funcionan. mp4, mkv (pista 2) y mp3 → WAV 16 kHz mono s16le; en el mkv el WAV tiene ~880 cruces por segundo = la pista 2 (880 Hz), no la 1 (440 Hz). Sin audio → `noAudioStream`. `npm run dev` arranca bien.

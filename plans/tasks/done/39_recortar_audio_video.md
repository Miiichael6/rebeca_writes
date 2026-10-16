# 39 · Recortar audio y video

**Estado:** ✅ Terminada (falta probarla a mano en `npm run dev`)
**Fase:** 9 — Pulido · **Depende de:** — · **Doc:** —

## Objetivo

Recortar un tramo del archivo de una entrada y guardarlo junto al original, con el tramo en el nombre (`<nombre> (01m30s-05m00s).<ext>`). El original no se toca. Una forma de onda muestra dónde hay voz o sonido y deja elegir el tramo arrastrando. Opcionalmente, el recorte entra en la cola para transcribirlo.

## Pasos

- [x] Dominio `src/main/domain/clip.ts`: validación del tramo, nombre, extensión, argumentos de ffmpeg (copiar pistas o recodificar), argumentos de la onda y `PeakAccumulator`.
- [x] Puerto `Clipper` + adaptador `ffmpegClipper` (borra la salida si falla; la onda sale de PCM s16le mono a 4 kHz por stdout).
- [x] `ClipService`: ruta desde el historial, primero `-c copy` y si falla recodifica (video → mp4 H.264/AAC, audio → mp3); nombre libre con ` (2)`; onda en caché por ruta; "Mostrar en el Explorador" solo para recortes escritos.
- [x] IPC `clip:cut`, `clip:waveform`, `clip:showInFolder` + preload `window.api.clip`.
- [x] Renderer: botón ✂ en los controles del reproductor, diálogo con inicio/fin (botón "posición actual"), duración, errores, casilla "Transcribir el recorte" y la forma de onda (`ClipWaveform`: tramo en acento, arrastrar elige el tramo, clic mueve el inicio).
- [x] Textos `clip.*` en es, en y pt-BR.
- [x] Tests: `tests/main/clip.test.ts`, `tests/renderer/clipDomain.test.ts`.
- [ ] Probar a mano: recorte de mp3, mp4 y un contenedor que obligue a recodificar; la onda coincide con la voz.
- [x] Tests / typecheck / lint pasan
- [x] Commit

## Bitácora

- 2026-10-15 — Al copiar pistas, en video el recorte empieza en el fotograma clave anterior: puede traer un segundo o dos de más al principio, nunca de menos. Se acepta a cambio de no perder calidad y ser instantáneo.

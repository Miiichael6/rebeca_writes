# 37 · Transcripción por trozos de voz

**Estado:** ⬜ Pendiente
**Fase:** 9 — Pulido · **Depende de:** 36 · **Doc:** §2.3

## Objetivo
Que whisper no pueda quedarse en bucle repitiendo una frase ("el almacenamiento, el almacenamiento…"). Para eso, el audio se corta en trozos de voz y cada trozo se transcribe por separado, con el modelo cargado una sola vez. Cada línea empieza donde empieza la voz y suele ser una frase completa.

## Pasos

### Paso 1 — Servidor de whisper
- [ ] Comprobar que los zips de la release fijada en `scripts/fetch-binaries.mjs` traen `whisper-server.exe` (cpu y cuda) y qué endpoints y opciones admite (`/inference`, `/load`, `-vmsd`, umbrales).
- [ ] `fetch-binaries.mjs`: copiar también `whisper-server.exe` en `resources/bin/<backend>/`.
- [ ] Puerto `WhisperServer` en `src/main/application/ports/` (arrancar con un modelo, transcribir un WAV, parar) y adaptador en `src/main/infrastructure/` que lanza el proceso en `127.0.0.1` con un puerto libre, espera a que responda y lo mata con `taskkill /T /F`.

### Paso 2 — Cortar en trozos de voz
- [ ] Decidir dónde se detectan los trozos: `whisper-cli --vad` solo para obtener los tramos, Silero con `onnxruntime` (ya se incluye para hablantes) o los tramos que imprime whisper con `--vad`. Anotar la decisión en la Bitácora.
- [ ] `src/main/domain/speechChunks.ts` (lógica pura): de los tramos de voz a trozos de 5–20 s. Los tramos cortos se juntan, los largos se parten y se añade un pequeño margen.
- [ ] Cortar cada trozo del WAV de 16 kHz sin volver a llamar a ffmpeg, reutilizando `pcmWav.ts` si sirve.

### Paso 3 — Pipeline
- [ ] `transcriptionPipeline.ts`: con el modo por trozos, enviar cada trozo al servidor, desplazar los tiempos al inicio del trozo y emitir los segmentos en vivo. El progreso va por trozos.
- [ ] Cancelar: abortar la petición en curso y parar el servidor.
- [ ] Fallback de backend (CUDA → CPU) igual que hoy. Si el servidor no arranca, usar el camino actual con `whisper-cli`.
- [ ] Revisar si `liveSession.ts` (ventanas en vivo) puede usar el mismo servidor en vez de lanzar `whisper-cli` por ventana.

### Paso 4 — Tests
- [ ] `speechChunks`: juntar tramos cortos, partir los largos, margen en los bordes, audio sin voz.
- [ ] Pipeline con dobles: tiempos desplazados por trozo, cancelación y fallback al camino actual.

### Paso 5 — Verificación
- [ ] Prueba real: la grabación de clase de 38 min que entró en bucle (37:15–37:28) con tiny, small y medium. No debe haber bucles y los tiempos deben coincidir con la voz. Comparar el tiempo total con el modo actual.
- [ ] Código organizado: una responsabilidad por archivo, lógica pura separada de la integración, sin duplicación ni código muerto
- [ ] Tests / typecheck / lint pasan
- [ ] Commit: `feat(transcription): transcribir por trozos de voz con whisper-server`

## Criterios de aceptación
- [ ] La grabación que antes entraba en bucle se transcribe sin repeticiones con tiny.
- [ ] El modelo se carga una sola vez por archivo, no una vez por trozo.
- [ ] Los tiempos de cada línea empiezan donde empieza la voz (±0,5 s).
- [ ] Si el servidor falla, la transcripción sigue funcionando con `whisper-cli` como hoy.

## Bitácora
<!-- Resumida: 1–3 entradas de una línea. Solo decisiones no obvias, problemas y desviaciones. -->
- 2026-10-02 — Origen: en la tarea 36 se vio que otra app de escritorio con whisper.cpp evita estos bucles con un Silero VAD propio. Corta la grabación en unos 135 "párrafos" de unos 17 s y los transcribe uno a uno con el modelo cargado.

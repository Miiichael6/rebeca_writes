# 29 · Grabar con el micrófono

**Estado:** ⬜ Pendiente
**Fase:** 9 — Pulido · **Depende de:** 27, 28 · **Doc:** petición del usuario (2026-09-30)
**Código de origen:** sidecar Rust `rl-capture` de Rebecca Listen (`../rebecca_listen/native/`, protocolo en `native/PROTOCOL.md`) y su conversión a PCM 16 kHz (`../rebecca_listen/src/main/audio/live/pcm16k.ts`, `dsp/resampler.ts`, `engine/SidecarAudioEngine.ts`); la mezcla de "Ambos" sale de `mixer.ts`, `mixedStream.ts`, `silence.ts` y `dsp/` (`fifo`, `channelMap`, `driftMeter`, `limiter`)

## Objetivo
Un botón con icono de micrófono en la barra de herramientas graba dentro de RebeccaWrites y transcribe en vivo mientras suena el audio. Se elige la fuente: **Computadora** (lo que suena en el equipo), **Mi voz** (micrófono) o **Ambos a la vez**. Funciona igual que la tarea 27 pero sin Rebecca Listen. Al parar, la grabación se guarda como archivo de audio y la entrada queda como una transcripción normal (reproducir, buscar, exportar).

## Enfoque
Se reutiliza la sesión en vivo de la 27: la propia RebeccaWrites escribe el `.pcm` (s16le, 16 kHz, mono) que hoy escribe Listen y llama a `LiveControl` con `start`/`end` en vez de recibirlo por argv. La captura la hace `rl-capture.exe` traído de Listen (WASAPI vía `cpal`): `kind: "render"` (loopback) para Computadora, `kind: "capture"` para Mi voz, y los dos streams mezclados para Ambos. Se usan los dispositivos predeterminados de Windows de cada tipo (D7).

## Pasos
- [ ] 1. Traer el sidecar: copiar `../rebecca_listen/native/` a `native/` (sin `target/`), `scripts/copy-native.mjs` que deje `rl-capture.exe` en `resources/bin/`, script `build:native` en `package.json` y encadenarlo en `build:win`/`release`; `native/target` al `.gitignore` y `native/**` fuera del empaquetado en `electron-builder.yml`
- [ ] 2. `domain/pcm16k.ts` (+ `domain/resampler.ts`): bajada a mono, remuestreo a 16 kHz y paso a s16le, portado de Listen; puro, con test (incluido que el resultado no depende de cómo se partan los bloques)
- [ ] 3. Puerto `application/ports/audioCapture.ts` (`defaultDevice(kind)`, `open(device)` → stream con `sampleRate`, `channels`, `onData`, `onError`, `stop`) y adaptador `infrastructure/capture/sidecarAudioCapture.ts` (spawn de `rl-capture.exe`, comandos JSON por stdin, eventos por stderr, demux de bloques binarios de stdout); el demux de bloques y el lector de líneas en `domain/` con test
- [ ] 4. Fuentes: `domain/recordingSource.ts` (`'system' | 'voice' | 'both'`). Para Computadora, relleno de silencio por reloj (`domain/loopbackSilence.ts`, de `silence.ts`: WASAPI loopback no entrega nada mientras no suena nada). Para Ambos, `domain/mixer.ts` (+ `fifo`, `channelMap`, `driftMeter`, `limiter`) portado de Listen, con el loopback como reloj, y `application/mixedCapture.ts` que abre los dos y, si se pierde uno, cierra el otro; puros con test
- [ ] 5. `application/micRecording.ts`: caso de uso empezar/parar. Al empezar abre la fuente elegida, crea el `.pcm` en `%TEMP%\rebecca-live\`, escribe los bloques convertidos y llama a `LiveControl` `start` con nombre "Grabación AAAA-MM-DD HH-mm". Al parar cierra el stream, convierte el `.pcm` a MP3 con ffmpeg en la carpeta de grabaciones (D6: por defecto `Documentos\RebeccaWrites\Grabaciones`, ajuste `recordingsDir` en Configuración con botón para cambiarla) y llama a `LiveControl` `end` con esa ruta. Error de captura (dispositivo desconectado, sin permiso) → para y cierra con lo transcrito
- [ ] 6. Exclusión con Listen: si llega un `--live-start` de Listen mientras graba el micrófono (o al revés), se rechaza el segundo con aviso; nunca dos sesiones en vivo
- [ ] 7. Componer en `composition.ts`; IPC `mic:start(source)`, `mic:stop`, `mic:state` en `ipc.ts`, tipados en `preload/index.d.ts`; el sidecar se cierra al salir de la app
- [ ] 8. Renderer: botón `Mic` de `lucide-react` en la Toolbar (estilo de los demás botones), pasa a `Square` rojo con contador mm:ss mientras graba; deshabilitado si hay una sesión en vivo de Listen. Al lado, una flecha abre un menú con las tres fuentes (Computadora / Mi voz / Ambos); la elegida se guarda en ajustes (`recordingSource`, por defecto `voice`) y el nombre de la entrada la indica. Store `store/mic.ts`. Textos en es, en y pt-BR
- [ ] 9. Verificación: tests (`npm run test`), `npm run typecheck`, lint; `npm run build:native` compila en limpio; en `npm run dev` grabar ~1 min con cada fuente (Mi voz hablando; Computadora con un vídeo sonando y pausas en silencio; Ambos hablando encima del vídeo), ver que el texto aparece a los pocos segundos, parar, reproducir y exportar SRT; desconectar el micrófono a mitad en Mi voz y en Ambos; `npm run build:win` y comprobar que el instalado graba (sidecar fuera del asar)
- [ ] 10. Commit: `feat(mic): grabar y transcribir desde el micrófono (tarea 29)`

## Criterios de aceptación
- [ ] Las tres fuentes graban y transcriben: Computadora, Mi voz y Ambos a la vez (en Ambos se oyen las dos cosas en el archivo final y los silencios del equipo no acortan la grabación)
- [ ] Con un clic en el micrófono empieza a grabar y el primer texto aparece en pocos segundos en una entrada nueva de la barra lateral
- [ ] Al parar queda un MP3 en la carpeta de grabaciones (cambiable en Configuración) y la entrada se reproduce y exporta como cualquier otra; no queda `.pcm` en `%TEMP%`
- [ ] Desconectar el micrófono a mitad no cuelga la app: la entrada se cierra con lo transcrito y un aviso
- [ ] La app instalada graba igual que en desarrollo

## Bitácora
- 2026-09-30 — D7 resuelta: tres fuentes (Computadora, Mi voz, Ambos) con los dispositivos predeterminados de Windows; se elige en un menú junto al botón. Amplía la tarea con la mezcla de Listen.
- 2026-09-30 — D6 resuelta: MP3; carpeta por defecto `Documentos\RebeccaWrites\Grabaciones`, cambiable en Configuración.

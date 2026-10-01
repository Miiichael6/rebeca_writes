# 29 · Grabar con el micrófono

**Estado:** ✅ Terminada
**Fase:** 9 — Pulido · **Depende de:** 27, 28 · **Doc:** petición del usuario (2026-09-30)
**Código de origen:** sidecar Rust `rl-capture` de Rebecca Listen (`../rebecca_listen/native/`, protocolo en `native/PROTOCOL.md`) y su conversión a PCM 16 kHz (`../rebecca_listen/src/main/audio/live/pcm16k.ts`, `dsp/resampler.ts`, `engine/SidecarAudioEngine.ts`); la mezcla de "Ambos" sale de `mixer.ts`, `mixedStream.ts`, `silence.ts` y `dsp/` (`fifo`, `channelMap`, `driftMeter`, `limiter`)

## Objetivo

Un botón con icono de micrófono en la barra de herramientas graba dentro de RebeccaWrites y transcribe en vivo mientras suena el audio. Se elige la fuente: **Computadora** (lo que suena en el equipo), **Mi voz** (micrófono) o **Ambos a la vez**. Funciona igual que la tarea 27 pero sin Rebecca Listen. Al parar, la grabación se guarda como archivo de audio y la entrada queda como una transcripción normal (reproducir, buscar, exportar).

## Enfoque

Se reutiliza la sesión en vivo de la 27: la propia RebeccaWrites escribe el `.pcm` (s16le, 16 kHz, mono) que hoy escribe Listen y llama a `LiveControl` con `start`/`end` en vez de recibirlo por argv. La captura la hace `rl-capture.exe` traído de Listen (WASAPI vía `cpal`): `kind: "render"` (loopback) para Computadora, `kind: "capture"` para Mi voz, y los dos streams mezclados para Ambos. Se usan los dispositivos predeterminados de Windows de cada tipo (D7).

## Pasos

- [x] 1. Traer el sidecar: copiar `../rebecca_listen/native/` a `native/` (sin `target/`), `scripts/copy-native.mjs` que deje `rl-capture.exe` en `resources/bin/`, script `build:native` en `package.json` y encadenarlo en `build:win`/`release`; `native/target` al `.gitignore` y `native/**` fuera del empaquetado en `electron-builder.yml`
- [x] 2. `domain/pcm16k.ts` (+ `domain/resampler.ts`): bajada a mono, remuestreo a 16 kHz y paso a s16le, portado de Listen; puro, con test (incluido que el resultado no depende de cómo se partan los bloques)
- [x] 3. Puerto `application/ports/audioCapture.ts` (`openDefault(kind)` → stream con `sampleRate`, `channels`, `onData`, `onError`, `stop`) y adaptador `infrastructure/capture/sidecarAudioCapture.ts` (spawn de `rl-capture.exe`, comandos JSON por stdin, eventos por stderr, demux de bloques binarios de stdout); el demux de bloques y el lector de líneas en `domain/` con test
- [x] 4. Fuentes: `shared/recording.ts` (`'system' | 'voice' | 'both'`). Para Computadora, relleno de silencio por reloj (`domain/loopbackSilence.ts`, de `silence.ts`: WASAPI loopback no entrega nada mientras no suena nada). Para Ambos, `domain/mixer.ts` (+ `fifo`, `channelMap`, `driftMeter`, `limiter`) portado de Listen, con el loopback como reloj, y `application/recordingSources.ts` que abre los dos y, si se pierde uno, cierra el otro; puros con test
- [x] 5. `application/micRecording.ts`: caso de uso empezar/parar. Al empezar abre la fuente elegida, crea el `.pcm` en `%TEMP%\rebecca-live\`, escribe los bloques convertidos y llama a `LiveControl` `start` con el nombre que manda el renderer ("Grabación AAAA-MM-DD HH-mm", traducido). Al parar cierra el stream, convierte el `.pcm` a MP3 con ffmpeg en la carpeta de grabaciones (D6: por defecto `Documentos\RebeccaWrites\Grabaciones`, ajuste `recordingsDir` en Configuración con botón para cambiarla) y llama a `LiveControl` `end` con esa ruta. Error de captura (dispositivo desconectado, sin permiso) → para y cierra con lo transcrito
- [x] 6. Exclusión con Listen: si llega un `--live-start` de Listen mientras graba el micrófono (o al revés), se rechaza el segundo con aviso; nunca dos sesiones en vivo
- [x] 7. Componer en `composition.ts`; IPC `mic:start(source, name)`, `mic:stop`, `mic:state` y los de la carpeta de grabaciones en `ipc.ts`, tipados en `shared/ipc.ts` (`AppApi`); el sidecar se cierra al salir de la app
- [x] 8. Renderer: botón `Mic` de `lucide-react` sin fondo en el pie de la barra lateral, a la izquierda de "Cola" (componente `components/MicButton/`), pasa a `Square` rojo con contador mm:ss mientras graba; deshabilitado si hay una sesión en vivo de Listen. Al lado, una flecha abre un menú con las tres fuentes (Computadora / Mi voz / Ambos); la elegida se guarda en ajustes (`recordingSource`, por defecto `voice`) y el nombre de la entrada la indica. Store `store/mic.ts`. Carpeta de grabaciones en Configuración › Almacenamiento (Cambiar… / Abrir carpeta). Textos en es, en y pt-BR
- [x] 9. Verificación
  - [x] Tests (`npm run test`), `npm run typecheck`, lint sin errores
  - [x] `npm run build:native` compila en limpio
  - [x] Prueba de humo con dispositivos reales (sidecar + `.pcm` + MP3 con ffmpeg) en las tres fuentes
  - [x] `npm run dev` arranca sin errores
  - [x] Manual en `npm run dev`: grabar ~1 min con cada fuente (Mi voz hablando; Computadora con un vídeo sonando y pausas en silencio; Ambos hablando encima del vídeo), ver que el texto aparece a los pocos segundos, parar, reproducir y exportar SRT
  - [x] Manual: desconectar el micrófono a mitad en Mi voz y en Ambos
  - [x] Manual: desconectar los audífonos a mitad en Computadora y en Ambos: sigue grabando por los parlantes
  - [x] Manual: elegir un micrófono que no sea el predeterminado en el menú y comprobar que graba de ese
  - [x] `npm run build:win` genera el instalador con `rl-capture.exe` en `app.asar.unpacked` y sin `native/`
  - [x] Manual: comprobar que la app instalada graba
- [x] 10. Commit: `feat(mic): grabar y transcribir desde el micrófono (tarea 29)`

## Criterios de aceptación

- [x] Las tres fuentes graban y transcriben: Computadora, Mi voz y Ambos a la vez (en Ambos se oyen las dos cosas en el archivo final y los silencios del equipo no acortan la grabación)
- [x] Con un clic en el micrófono empieza a grabar y el primer texto aparece en pocos segundos en una entrada nueva de la barra lateral
- [x] Al parar queda un MP3 en la carpeta de grabaciones (cambiable en Configuración) y la entrada se reproduce y exporta como cualquier otra; no queda `.pcm` en `%TEMP%`
- [x] Desconectar el micrófono a mitad no cuelga la app: la entrada se cierra con lo transcrito y un aviso
- [x] La app instalada graba igual que en desarrollo

## Bitácora

- 2026-09-30 — D7 resuelta: tres fuentes (Computadora, Mi voz, Ambos) con los dispositivos predeterminados de Windows; se elige en un menú junto al botón. Amplía la tarea con la mezcla de Listen.
- 2026-09-30 — D6 resuelta: MP3; carpeta por defecto `Documentos\RebeccaWrites\Grabaciones`, cambiable en Configuración.
- 2026-09-30 — Mezcla sin `driftMeter` ni ajuste de ratio: para transcribir basta con que la FIFO se recoloque al vaciarse o desbordarse. El silencio del loopback va por temporizador (`withLoopbackSilence`), no al llegar micrófono, para que Computadora sola no se pare y la sesión no la dé por colgada. `RecordingSource` vive en `shared/` porque la usa también el renderer.
- 2026-10-01 — Exclusión en `LiveControl` por origen (`listen`/`mic`, `LiveBusyError`): si Listen empieza mientras graba el micrófono, su archivo va a la cola al terminar. El nombre de la entrada lo traduce el renderer (el main no tiene i18n).
- 2026-10-01 — Verificado con dispositivos reales mediante una prueba de humo temporal (no versionada): 3 s grabados → MP3 de 3,1 s en las tres fuentes, también Computadora sin sonido. Falta la prueba manual con la interfaz (no se puede hacer desde aquí); la tarea sigue 🔄 hasta entonces.
- 2026-10-01 — El botón de grabar pasa de la barra superior al pie de la barra lateral, junto a "Cola", a petición del usuario; el menú de fuentes se abre hacia arriba.
- 2026-10-01 — A petición del usuario, Mi voz y Ambos pueden usar un micrófono elegido en el menú del botón (`recordingMicId`, vacío = predeterminado). Si ya no está conectado se abre el predeterminado. El loopback sigue siendo siempre la salida predeterminada.
- 2026-10-01 — A petición del usuario, onda de nivel junto al contador mientras graba: el main mide el pico de lo que se graba cada 50 ms (`LevelMeter`, escala de dB con suelo en -50 dB) y lo emite por `mic:level`; el renderer guarda las últimas 12 barras. Con Ambos mide la mezcla, así que reacciona a la voz y al sonido del equipo.
- 2026-10-01 — A petición del usuario, la elección de micrófono pasa a un submenú "Micrófono ▸" (con el elegido al lado) en vez de una lista dentro del menú de fuentes. `Menu` admite ítems con `submenu` (un nivel; se abre al pasar el puntero, con clic o con →; ← o Esc vuelven) y `hint`.
- 2026-10-01 — El menú del botón quedaba recortado por el `overflow: hidden` de la barra lateral (y el submenú, oculto). `Menu` pasa a ser un `popover` (capa superior) colocado con CSS anchor positioning (`anchor-scope` por ancla, `position-try-fallbacks` si no cabe). Además, `MenuItem.icon` (lucide): iconos en el menú de grabar, Exportar y los menús contextuales del historial y de los segmentos. Verificado con captura en la app (instancia aparte por CDP).
- 2026-10-01 — A petición del usuario, medidor "Nivel de entrada" arriba del submenú Micrófono (como el de Windows): mientras el submenú está abierto el main abre un monitor del micrófono elegido (`mic:monitorStart`/`mic:monitorStop`, sin escribir nada) y emite su nivel por `mic:level`; empezar a grabar cierra el monitor. Verificado por CDP: llegan 20 niveles/s y la línea de entrada Realtek marca ruido (los demás micrófonos, en silencio).
- 2026-10-01 — A petición del usuario, elegir una fuente o un micrófono ya no cierra el menú (`MenuItem.keepOpen`); el resto de menús sí se cierran al elegir. Además, el submenú tarda 300 ms en plegarse cuando el puntero pasa a otro ítem: antes se cerraba solo si el contenido se movía bajo el puntero o al ir en diagonal hacia él.
- 2026-10-01 — A petición del usuario, los medidores pasan del submenú a lo alto del menú de grabar, encima de las fuentes: volumen del sistema (`Volume2`) y nivel del micrófono elegido (`Mic`). El monitor abre los dos (el loopback con `withLoopbackSilence`, para que baje a cero al callar el equipo) y emite por `mic:monitorLevel` (`{ device, level }`); `mic:level` queda solo para la onda de la grabación. Si uno no se puede abrir, el otro mide igual. Verificado por CDP con un tono de la propia app: el medidor del sistema marca ≈0,85.
- 2026-10-01 — A petición del usuario, los medidores siguen a la fuente elegida: Computadora solo el del sistema, Mi voz solo el del micrófono, Ambos los dos (`sourceDevices` en `shared/recording.ts`, usado por el main y el renderer). El monitor recibe la fuente (`mic:monitorStart` con `source, micId`) y abre solo esos dispositivos, así el micrófono no se abre si se mide solo el sistema. Verificado por CDP cambiando de fuente con el menú abierto.
- 2026-10-01 — "Abrir carpeta" de las grabaciones mostraba "No se ha encontrado la aplicación" en el equipo del usuario: `shell.openPath` usa el verbo por defecto de las carpetas y allí `HKCR\Directory\shell` vale `none` (lo dejó otro programa). `openFolder` lanza ahora `explorer.exe` directamente en Windows; arregla también "Abrir carpeta" de los logs y de los modelos. Verificado en la app: se abre el Explorador en `Grabaciones`.
- 2026-10-01 — Al probar a mano, desconectar los audífonos cortaba Computadora y Ambos con "Se perdió el dispositivo de audio", aunque Windows ya hubiera pasado la salida a los parlantes. `followDefaultOutput` (en `recordingSources.ts`) reabre la salida predeterminada cuando el loopback avisa `device_lost`/`stream_failed` (hasta 10 intentos cada 200 ms) y adapta el dispositivo nuevo al formato del primero (`domain/capture/formatAdapter.ts`: canales + remuestreo), así el `.pcm`, la mezcla y el reloj de silencio no notan el cambio; el hueco lo rellena `withLoopbackSilence`. Solo se corta si no queda ninguna salida o se cae el sidecar. Perder el micrófono sigue cortando. También lo usa el medidor del sistema del menú.
- 2026-10-01 — Pruebas manuales hechas por el usuario en la app (las tres fuentes, desconectar micrófono y audífonos, micrófono no predeterminado, app instalada): todo bien. Tarea cerrada.

# 27 · Transcripción en vivo desde Rebecca Listen

**Estado:** ✅ Terminada
**Fase:** 9 — Pulido · **Depende de:** 17, 18, 19 · **Doc:** petición del usuario (2026-09-30)
**Pareja en Rebecca Listen:** tarea 46 (`rebecca_listen/plan/tasks/pending/46_transcripcion_en_vivo_rebeccawrites.md`)

## Objetivo
Cuando Rebecca Listen graba con la casilla "Vincular Transcripción con RebeccaWrites" marcada, RebeccaWrites recibe el audio mientras se graba y muestra la transcripción en tiempo real, en una entrada de la barra lateral con el nombre de la grabación (p. ej. "reunión_teams"). Al terminar la grabación, esa entrada queda como una transcripción normal: se reproduce, se busca y se exporta igual que las demás.

## Contrato con Rebecca Listen (igual en la tarea 46 de Listen)
| Momento | Listen hace | RebeccaWrites hace |
|---|---|---|
| Empieza a grabar | Crea `%TEMP%\rebecca-live\<id>.pcm` (PCM s16le, 16 kHz, mono, sin cabecera) y ejecuta `RebeccaWrites.exe --live-start="<pcm>" --live-name="<nombre>"` | Crea una entrada "en vivo" en la barra lateral con ese nombre, la selecciona, lee el archivo según crece y transcribe por ventanas de ~30 s (`-l auto`, con su modelo y backend) |
| Graba / pausa | Añade muestras al `.pcm` (en pausa no añade) | Sigue leyendo; si no llega audio, espera |
| Para | Cierra el `.pcm` y ejecuta `RebeccaWrites.exe --live-end="<pcm>" --live-media="<ruta final .mp3/.wav>"` | Transcribe lo que falte, cambia la entrada a la grabación final y borra el `.pcm` |
| Listen se cierra de golpe | — | Si el `.pcm` lleva 2 min sin crecer y no llegó `--live-end`, cierra la entrada con lo transcrito |

## Pasos
- [x] 1. `live/liveArgs.ts`: interpretar `--live-start` / `--live-name` / `--live-end` / `--live-media` desde el argv (arranque y `second-instance`), separado de `pathsFromArgv` para que esos argumentos no acaben en la cola; puro, con test
- [x] 2. `live/liveWindows.ts` (+ `live/pcmWav.ts`): lógica pura de qué ventana toca según los bytes disponibles (ventana de 30 s = 960 000 bytes; la última puede ser más corta al llegar `--live-end`) y desplazamiento de tiempos de los segmentos; con test
- [x] 3. `live/liveSession.ts` (+ `live/liveEngine.ts`, `live/liveControl.ts`): vigila el `.pcm` (tamaño), recorta cada ventana a un WAV temporal (cabecera + bytes), la transcribe con el backend/modelo actuales y el idioma de ajustes, y emite los segmentos desplazados. Una sesión en vivo a la vez; la cola normal espera mientras hay una en curso (`holdTranscription`)
- [x] 4. Historial: entrada nueva con `live: true` (nombre de `--live-name`, sin medio aún); al `--live-end` se le asigna `--live-media`, pasa a terminada y se guarda como cualquier otra; el `.pcm` se borra
- [x] 5. Vigilancia: 2 min sin crecer y sin `--live-end` → se cierra con lo transcrito y aviso "La grabación se interrumpió"
- [x] 6. IPC y preload: `live:current` (invoke), `live:started` y `live:ended`; los segmentos, el final y cancelar van por los `transcribe:*` que ya había
- [x] 7. Renderer (`store/live.ts`): la entrada en vivo aparece en la Sidebar (arriba de "Hoy", con indicador de grabación), se selecciona sola y el `TranscriptView` añade los segmentos con desplazamiento automático; el reproductor queda deshabilitado hasta que llega `--live-media`
- [x] 8. Verificación con un simulador de Listen (mismos argumentos y `.pcm` que manda la 46): RebeccaWrites abierta y cerrada, parar con `--live-end`, Listen "muerto" sin `--live-end` (vigilante a los 120 s); `npm run typecheck`, lint y tests en verde
  - [ ] Prueba conjunta con la app real de Listen → queda en el paso 10 de la 46 de Listen
- [x] 9. Commit: `feat(live): transcripción en vivo desde Rebecca Listen`

## Criterios de aceptación
- [x] Al empezar a grabar en Listen con la casilla marcada, RebeccaWrites (abierta o no) muestra la entrada en la barra lateral y el primer texto llega en pocos segundos
- [x] El texto va apareciendo solo mientras sigue la grabación, en el idioma detectado
- [x] Al parar, la entrada se puede reproducir y exportar como cualquier transcripción, y no queda el `.pcm`
- [x] Los argumentos `--live-*` nunca meten archivos en la cola ni rompen "Abrir con"

## Bitácora
- 2026-09-30 — Tarea creada a petición del usuario, junto con la 46 de Rebecca Listen. Conexión por archivo PCM que crece + argumentos, sobre el `second-instance` que ya existe; sin servidor local.
- 2026-09-30 — Desviaciones del plan: ventanas de 5–30 s cortadas en el tramo más silencioso de los últimos 2 s (primer texto a los ~5 s, no a los 30), silencio se salta; cada ventana pasa por el `TranscriptionEngine` de siempre (probe + ffmpeg por trozo, ~0,1 s) en vez de un camino sin ffmpeg; idioma de ajustes y, si es `auto`, se fija con el de la primera ventana; canales `live:current`/`live:started`/`live:ended` + los `transcribe:*` de siempre en vez de `live:segments`/`live:state`; la entrada va arriba de "Hoy" como cualquier nueva.
- 2026-09-30 — Contrato a `--flag=valor`: con RebeccaWrites abierta, Chromium entrega a `second-instance` las opciones delante y los valores sueltos al final (`--live-start --live-name … <pcm> <nombre>`). Se aceptan las dos formas; Listen ya manda `=`. Tampoco se abre medio para una entrada en vivo (el reproductor intentaba el `.pcm` y tapaba la transcripción).
- 2026-09-30 — Verificado con `fake-listen` (voz TTS de 30 s escrita al ritmo real en el `.pcm`, CUDA medium) y CDP: el primer texto sale a los ~5 s y crece solo; al parar queda `reunion_teams.mp3` terminada, reproducible y sin `.pcm`; en frío el primer `--live-start` abre la app; sin `--live-end` se cierra a los 120 s con lo transcrito. La cola no recibió nada. La prueba con la Listen real queda en su 46.

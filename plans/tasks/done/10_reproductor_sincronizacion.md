# 10 · Reproductor y sincronización con la transcripción

**Estado:** ✅ Terminada
**Fase:** 3 — Reproductor · **Depende de:** 09 · **Doc:** §4.1 Reproductor, §6 atajos

## Objetivo
Un reproductor completo sincronizado con los segmentos: clic para saltar, resaltado y subtítulos.

## Pasos

### Paso 1 — Store del reproductor
- [x] `store/player.ts`: `currentTime`, `duration`, `playing`, `volume`, `rate`, `src`, `seek(t)`
- [x] Un solo `<video>` controlado por el store

### Paso 2 — Controles
- [x] Play/pausa
- [x] Barra de progreso con buscador (arrastrar y clic)
- [x] Tiempo actual / total (`mm:ss` o `h:mm:ss`)
- [x] Volumen + silencio
- [x] Velocidad: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x

### Paso 3 — Solo audio
- [x] Detectar ausencia de pista de video (probe)
- [x] Mostrar forma de onda (canvas con picos precalculados por ffmpeg) o fondo neutro con el nombre _(fondo neutro; ver Bitácora)_

### Paso 4 — Sincronización
- [x] `findActiveSegment(segments, t)` con búsqueda binaria (con test)
- [x] Resaltar el segmento activo en TranscriptView
- [x] Clic en un segmento → `seek(start)`

### Paso 5 — Subtítulos/CC
- [x] Capa superpuesta con el texto del segmento activo (no `<track>`, para actualizar en vivo)
- [x] Ocultable desde settings (`showCaptions`)

### Paso 6 — Panel y atajos
- [x] Mostrar/ocultar panel desde la Toolbar (el audio sigue sonando)
- [x] Altura desde settings (300–600 px)
- [x] `Espacio` play/pausa (sin interferir con inputs), `←/→` ±5 s

### Paso 7 — Archivo no disponible
- [x] Si el archivo original no existe: aviso + botón "Buscar archivo..." (se completa en la tarea 18)

### Paso 8 — Verificación
- [x] Video de más de 1 GB por `media://`: se reproduce al instante y se puede adelantar al final (pendiente de la tarea 09, paso 6)
- [x] Commit: `feat(player): reproductor sincronizado`

## Criterios de aceptación
- [x] Clic en cualquier línea salta al momento exacto
- [x] El resaltado sigue la reproducción sin saltos visibles

## Bitácora
- 2026-09-28 — Cómo llega un archivo al reproductor. La lista blanca de `media://` (tarea 09) no admite rutas que mande el renderer, y el historial real todavía no existe en el main (tarea 18). Por eso el único camino hoy es el diálogo del main: IPC `media:pickFile` → `services/mediaOpen.ts` (`openMedia(ruta)`: `registerMedia` + `probe`) → `OpenedMedia { id, filePath, fileName, info }`. El renderer guarda ese resultado por id de entrada en `useHistoryStore.media` (solo en memoria). Una entrada sin `media` se considera "no disponible" y muestra el aviso con **Buscar archivo...**, que abre ese diálogo y la asocia. Con las entradas de ejemplo esto es lo que se ve siempre, porque sus rutas son inventadas; en la tarea 18 el main registra `filePath` al cargar la entrada (con `openMedia`), comprueba si existe y persiste la ruta nueva de "Buscar archivo...". Los nombres de los filtros del diálogo llegan traducidos desde el renderer porque el main no tiene i18n.
- 2026-09-28 — `store/player.ts`: el `<video>` es la fuente de verdad del tiempo y de play/pausa; el store le da órdenes y `bindVideoEvents` copia sus eventos al estado. El elemento se guarda fuera del estado de Zustand (no pinta nada). Mientras suena, `currentTime` se lee con `requestAnimationFrame` y no solo con `timeupdate` (~4 por segundo): así el resaltado y los subtítulos cambian justo al empezar el segmento. Para que eso no repinte todo, el tiempo y la barra van en `SeekBar` y los subtítulos en `Captions`; TranscriptView se suscribe con un selector que devuelve el índice activo, así que solo se repinta al cambiar de segmento. Volumen, silencio y velocidad son globales (se mantienen al cambiar de archivo); la velocidad se vuelve a aplicar en `loadedmetadata` porque cargar otro `src` la devuelve a 1.
- 2026-09-28 — `findActiveSegment` devuelve el último segmento que **empezó** (búsqueda binaria sobre `start`), también en los silencios entre dos segmentos, para que el resaltado no parpadee. Los subtítulos sí comparan con `end` y desaparecen en los silencios. Antes del primer segmento devuelve `null`. `activeIndex` salió de `useTranscriptStore` (era un valor de ejemplo): ahora se deriva del tiempo del reproductor y solo hay resaltado si hay archivo cargado.
- 2026-09-28 — Solo audio: se decide con `info.videoCodec === null` del probe (las carátulas de mp3/m4a ya no cuentan como video, tarea 07); si no hubo probe se trata como video. Se eligió el **fondo neutro con el nombre** y no la forma de onda: la spec (§4.1) acepta cualquiera de las dos y la forma de onda exige otro proceso ffmpeg para calcular picos por archivo. Si más adelante se quiere, encaja en `.player-audio`. Se usa el mismo `<video>` también para audio, oculto con CSS.
- 2026-09-28 — Panel oculto: `.player-stage[hidden]` con `display: none`, sin desmontar el `<video>`, y el audio sigue sonando (comprobado). Subtítulos: capa propia sobre el video; `showCaptions` vive en `useUiStore` (por defecto `true`); el toggle de Configuración es de la tarea 21 y la persistencia de la 12. Velocidades: las de la tarea (0.5–2x); se quitó 1.75x del mock.
- 2026-09-28 — Atajos (`usePlayerShortcuts`, en la vista principal): `Espacio` play/pausa y `←/→` ±5 s, con `preventDefault` para que no desplacen la transcripción. No actúan si el foco está en input, textarea, select, botón, enlace, contenteditable o menú, ni con un `<dialog>` abierto, ni con Ctrl/Alt. Los segmentos son `role="button"` con `tabIndex=0`: `Enter` salta a ese segmento y `Espacio` sigue siendo play/pausa (después de hacer clic en una línea el foco queda en ella y lo natural es pulsar Espacio para reproducir). Con la barra de posición enfocada, las flechas saltan 5 s en vez de 0,1 s. Clic en el panel de video también hace play/pausa.
- 2026-09-28 — Verificación en la app real (`electron-vite dev` con `--remoteDebuggingPort` e `--inspect`, manejada con agent-browser; el diálogo del main se sustituyó por uno que devuelve la ruta a través del inspector de Node, sin tocar el código). Video H.264 de **6,8 GB** y 5 min generado con ffmpeg: `play()` en 8 ms, salto a 4:55 en ~0,5 s y sigue sonando; clic en `[00:21]` → `currentTime` exacto al `start`, resaltado y subtítulo de esa línea; al reproducir, el resaltado pasa solo a `[00:27]`; `Espacio` con el foco en la línea reproduce y pausa; `←` resta 5 s; ocultar el panel no para el audio; 2x avanza 2 s por segundo; silencio funciona; mp3 solo audio → fondo neutro con el nombre y duración real; entrada sin archivo → aviso + "Buscar archivo...". Typecheck, lint, prettier, `npm run build` y 125 tests en verde (7 nuevos de `findActiveSegment`, incluida una lista de 100 000 segmentos). Nota: si `ELECTRON_RUN_AS_NODE` está en el entorno (lo pone la terminal de VS Code en algunos casos), `electron-vite dev` falla con `Cannot read properties of undefined (reading 'isPackaged')`; hay que lanzarlo sin esa variable.

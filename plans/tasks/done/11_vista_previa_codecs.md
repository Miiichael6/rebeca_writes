# 11 · Vista previa para códecs no soportados

**Estado:** ✅ Terminada
**Fase:** 3 — Reproductor · **Depende de:** 07, 10 · **Doc:** §4.1 Reproductor

## Objetivo
Reproducir AVI, WMV, FLV, HEVC y demás generando en segundo plano un MP4 compatible.

## Pasos

### Paso 1 — Detección
- [x] Usar `isChromiumPlayable` de `probe` (tarea 07)
- [x] Si el video no es reproducible pero el audio sí → reproducir el audio de inmediato

### Paso 2 — Generación
- [x] `services/previewCache.ts`
- [x] `ffmpeg -i <in> -c:v libx264 -preset ultrafast -crf 28 -c:a aac -movflags +faststart <cache>/<hash>.mp4`
- [x] Clave de caché: hash de ruta + tamaño + mtime
- [x] Prioridad baja del proceso; no más de 1 generación a la vez
- [x] Progreso visible en el Player ("Preparando vista previa... 42 %")
- [x] Si el audio tampoco es reproducible: pista de audio AAC temporal primero

### Paso 3 — Cambio en caliente
- [x] Al terminar, cambiar `src` a la vista previa manteniendo la posición y el estado de reproducción

### Paso 4 — Límite de caché
- [x] Tamaño máximo configurable (settings, por defecto 5 GB)
- [x] Borrar lo menos usado recientemente (LRU por `atime` / índice propio)
- [x] `clear()` usado por "Borrar historial" y por "Vaciar caché" en Configuración

### Paso 5 — Verificación
- [x] Probar .avi, .wmv, .flv y un .mkv HEVC
- [x] Commit: `feat(player): vista previa para códecs no soportados`
- [x] **Cierre de Fase 3**

## Criterios de aceptación
- [x] Un .avi se reproduce (primero audio, luego video) sin congelar la UI
- [x] La caché no supera el límite

## Bitácora
- 2026-09-28 — Diseño. `services/previewCache.ts` (clase `PreviewCache`, sin importar electron, probada con el ffmpeg real) y `services/previews.ts` (la une a la app: carpeta `userData/preview-cache`, límite desde settings, lista blanca de `media://` y eventos al renderer). `previewPlan(info)` decide: `null` si `isChromiumPlayable`; si no, `audio: 'original'` cuando el contenedor y el códec de audio los reproduce Chromium (p. ej. HEVC en mp4 con AAC: suena el original al instante), `'copy'` para aac/mp3 en contenedor no reproducible y `'encode'` para el resto (ac3, wma...). Los archivos de solo audio no reproducibles (wma) generan directamente un `.m4a` como vista previa. `openMedia` devuelve `preview: PreviewStatus` (`none | pending | ready | failed`) y los cambios llegan por el evento `media:preview`; el renderer los guarda en `store/preview.ts` y `lib/preview.ts#playbackFor` decide qué fuente suena.
- 2026-09-28 — Generación. Clave = sha1 de ruta (en minúsculas en Windows) + tamaño + mtime. Comando de la tarea más: `-map 0:v:0 -map 0:a:0?` (primera pista de cada tipo), `scale` a dimensiones pares y `-pix_fmt yuv420p` (el HEVC de 10 bits daba H.264 High 10, que Chromium no decodifica), `-max_muxing_queue_size 4096` y `-progress pipe:1` para el porcentaje. Se escribe a `.part` y se renombra (atómico); los `.part` y audios provisionales que deje un cierre se borran al arrancar. ffmpeg corre con `os.setPriority(BELOW_NORMAL)`, de a uno, y el último pedido va primero (si el usuario abre otro archivo, ese pasa delante). El audio provisional (`<clave>.tmp-audio.m4a`) se saca apenas se pide, fuera de la cola, porque tarda segundos; se borra cuando empieza la siguiente generación. Codificadores del audio provisional, del más rápido al más seguro: `copy` → `aac_mf` (Media Foundation, ~1 s para 3 min de AC3 frente a ~9 s del `aac` nativo) → `aac -aac_coder fast` (siempre disponible; `aac_mf` falta en Windows N).
- 2026-09-28 — Cambio en caliente: `usePlayerStore.load({ key, sourceId, ... })`. Con la misma `key` (mismo medio) y otro `src`, guarda posición y play/pausa y los vuelve a aplicar en `loadedmetadata`. Con otra `key` reinicia. El Player muestra "Preparando vista previa... N %" con spinner sobre el fondo de audio mientras suena el provisional, o "No se pudo preparar la vista previa" si ffmpeg falla (se queda el audio si lo hay).
- 2026-09-28 — Límite: clave `previewCacheMaxGB` en settings.json (por defecto 5; la pantalla de Configuración es de la tarea 21, que además llamará a `media.clearPreviewCache` y `media.getPreviewCacheSize`, ya expuestos en `window.api`). LRU por mtime, que se actualiza con `utimes` en cada uso (Windows no mantiene `atime` de forma fiable). Se aplica tras cada generación; nunca borra la recién hecha ni el audio provisional de trabajos en curso. "Borrar historial" ya llama a `clearPreviewCache()`: cancela ffmpeg y vacía solo la carpeta de la caché.
- 2026-09-28 — Verificación en la app real (misma técnica que la tarea 10) con clips de 3 min a 720p: **.avi** audio provisional al instante, progreso 0 → 40 %… y cambio a video 1280 px sin dejar de sonar; **.wmv** el cambio conserva los 30 s y la pausa; **.flv** sigue sonando durante el cambio (43,67 → 44,08 s); **mp4 HEVC** suena el audio original enseguida y conserva la posición; **.mkv HEVC 10 bits + AC3** vista previa lista a 1280 px. Con `previewCacheMaxGB: 0.15`, al terminar el FLV se desalojó la vista previa más antigua. "Borrar historial" vació la carpeta y los originales siguen intactos. La UI respondió en todo momento. Typecheck, lint, prettier, `npm run build`, `npm run dev` y 153 tests en verde (nuevos: plan, clave, argumentos, desalojo LRU, y con ffmpeg real avi/wmv/flv/mkv HEVC/wma, cola de uno en uno con prioridad al último, límite, restos al arrancar y `clear()`).
- 2026-09-28 — Pendiente para otras tareas: tras "Vaciar caché" un `OpenedMedia.preview` antiguo en memoria puede apuntar a un id ya borrado; se resuelve al reabrir el medio (tareas 18 y 21). El audio provisional del último trabajo queda en disco hasta la siguiente generación, un `clear()` o el próximo arranque (cuenta para el límite).

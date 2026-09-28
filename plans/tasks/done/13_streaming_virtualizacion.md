# 13 · Transcripción en tiempo real y lista virtualizada

**Estado:** ✅ Terminada
**Fase:** 4 — Transcripción en vivo · **Depende de:** 08, 10 · **Doc:** §4.1 Panel de transcripción, §6

## Objetivo
Ver crecer el texto mientras se transcribe, con reproducción simultánea y rendimiento fluido en archivos de horas.

## Pasos

### Paso 1 — Conexión engine → store
- [x] Suscribirse a `transcribe:segment/progress/done/error` en `useTranscriptStore`
- [x] Añadir segmentos al final sin recrear todo el array en cada evento
- [x] Guardar en el historial en paralelo (tarea 12)

### Paso 2 — Lista virtualizada
- [x] `@tanstack/react-virtual` con altura dinámica (`measureElement`)
- [x] `scrollToIndex` expuesto para búsqueda y autoscroll
- [x] Probar con 10 000 segmentos de ejemplo

### Paso 3 — Progreso
- [x] Barra fina con % bajo el encabezado
- [x] Tiempo restante estimado (a partir del ritmo de los últimos N %)
- [x] Texto de fase: "Preparando audio…" / "Transcribiendo…"

### Paso 4 — Botones de la Toolbar
- [x] **Transcribir** visible con archivo cargado sin transcripción → encola o inicia
- [x] **Cancelar** mientras transcribe → `transcribe:cancel`
- [x] Deshabilitar el cambio de modelo e idioma durante la transcripción de ese archivo

### Paso 5 — Reproducción simultánea
- [x] El archivo se puede reproducir desde el inicio de la transcripción
- [x] Los segmentos nuevos aparecen en los subtítulos si ya se llegó a ese tiempo

### Paso 6 — Errores
- [x] Toast o banner con mensaje claro según el código de error (tarea 08)

### Paso 7 — Verificación
- [x] Commit: `feat(transcript): streaming en vivo y virtualización`

## Criterios de aceptación
- [x] El texto aparece mientras el video se reproduce
- [x] Una transcripción de 3 h se mantiene fluida al hacer scroll

## Bitácora
- 2026-09-28 — `store/transcript.ts` guarda el trabajo en curso (`job`: fase, %, tiempo restante, segmentos). `store/transcription.ts` hace de puente con el motor: lanza y cancela, y reparte los eventos `transcribe:*` entre la vista y el historial. Si durante la transcripción se abre otro archivo, el trabajo sigue y al volver se ven sus segmentos.
- 2026-09-28 — Paso 1.2: el main ya agrupa los segmentos (un evento cada ~100 ms), así que el array se copia una vez por lote, no por segmento. Se mantiene inmutable a propósito para que los `useMemo` y selectores de las tareas 14–16 detecten los cambios. En test, 10 000 segmentos en lotes de 20 tardan mucho menos de 500 ms.
- 2026-09-28 — Paso 1.3: el renderer manda `historyId` y el main guarda los segmentos por su cuenta (tarea 12). Para tener una entrada real en disco se añadió el IPC `history:create` y un «Abrir archivo» mínimo (un solo archivo, sin cola). La selección múltiple y la cola son de la 19, y el resto del IPC del historial es de la 18. Hasta la 18, las entradas de ejemplo (`mocks.ts`) conviven con las reales, que solo duran lo que dura la sesión.
- 2026-09-28 — Lista: `useVirtualizer` con `measureElement`, filas memorizadas y `lib/transcriptScroll.ts` (`scrollToSegment`) para las tareas 14 y 15. Se añadió la entrada de ejemplo `h9` (3 h, 10 000 segmentos). En dev solo hay unas 28 filas en el DOM y el scroll hasta el final va a ritmo de frame. `scrollToSegment(5000)` funciona.
- 2026-09-28 — Tiempo restante: `lib/eta.ts` mide el ritmo de los últimos 10 puntos de progreso, solo durante la fase de transcripción y con al menos 3 s de intervalo. En archivos cortos no llega a mostrarse porque whisper informa el progreso a saltos grandes.
- 2026-09-28 — Transcribir queda deshabilitado (con tooltip) si el archivo no está localizado o si ya hay otra transcripción en curso. Cuando exista la cola (tarea 17), en ese caso se encolará.
- 2026-09-28 — Verificado en dev con un audio sintético (voz de Windows, 105 s) abierto con el diálogo real:
  - Con CUDA, los segmentos aparecen en vivo mientras suena el audio, los subtítulos los muestran, y el modelo y el idioma quedan bloqueados.
  - Con CPU y 21 min, el tiempo restante coherente baja de ~0:46 a ~0:11, y `done` llega 0,2 s después del 100 %.
  - Cancelar deja el estado listo y muestra un toast. Con el modelo sin descargar sale el aviso fijo más un toast («El modelo elegido no está descargado.»).
  - El historial en disco refleja cada estado.

# 13 · Transcripción en tiempo real y lista virtualizada

**Estado:** ⬜ Pendiente
**Fase:** 4 — Transcripción en vivo · **Depende de:** 08, 10 · **Doc:** §4.1 Panel de transcripción, §6

## Objetivo
Ver crecer el texto mientras se transcribe, con reproducción simultánea y rendimiento fluido en archivos de horas.

## Pasos

### Paso 1 — Conexión engine → store
- [ ] Suscribirse a `transcribe:segment/progress/done/error` en `useTranscriptStore`
- [ ] Añadir segmentos al final sin recrear todo el array en cada evento
- [ ] Guardar en el historial en paralelo (tarea 12)

### Paso 2 — Lista virtualizada
- [ ] `@tanstack/react-virtual` con altura dinámica (`measureElement`)
- [ ] `scrollToIndex` expuesto para búsqueda y autoscroll
- [ ] Probar con 10 000 segmentos de ejemplo

### Paso 3 — Progreso
- [ ] Barra fina con % bajo el encabezado
- [ ] Tiempo restante estimado (a partir del ritmo de los últimos N %)
- [ ] Texto de fase: "Preparando audio…" / "Transcribiendo…"

### Paso 4 — Botones de la Toolbar
- [ ] **Transcribir** visible con archivo cargado sin transcripción → encola o inicia
- [ ] **Cancelar** mientras transcribe → `transcribe:cancel`
- [ ] Deshabilitar el cambio de modelo e idioma durante la transcripción de ese archivo

### Paso 5 — Reproducción simultánea
- [ ] El archivo se puede reproducir desde el inicio de la transcripción
- [ ] Los segmentos nuevos aparecen en los subtítulos si ya se llegó a ese tiempo

### Paso 6 — Errores
- [ ] Toast o banner con mensaje claro según el código de error (tarea 08)

### Paso 7 — Verificación
- [ ] Commit: `feat(transcript): streaming en vivo y virtualización`

## Criterios de aceptación
- [ ] El texto aparece mientras el video se reproduce
- [ ] Una transcripción de 3 h se mantiene fluida al hacer scroll

## Bitácora
- _(fecha — nota)_

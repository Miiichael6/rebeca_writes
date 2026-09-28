# 10 · Reproductor y sincronización con la transcripción

**Estado:** ⬜ Pendiente
**Fase:** 3 — Reproductor · **Depende de:** 09 · **Doc:** §4.1 Reproductor, §6 atajos

## Objetivo
Un reproductor completo sincronizado con los segmentos: clic para saltar, resaltado y subtítulos.

## Pasos

### Paso 1 — Store del reproductor
- [ ] `store/player.ts`: `currentTime`, `duration`, `playing`, `volume`, `rate`, `src`, `seek(t)`
- [ ] Un solo `<video>` controlado por el store

### Paso 2 — Controles
- [ ] Play/pausa
- [ ] Barra de progreso con buscador (arrastrar y clic)
- [ ] Tiempo actual / total (`mm:ss` o `h:mm:ss`)
- [ ] Volumen + silencio
- [ ] Velocidad: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x

### Paso 3 — Solo audio
- [ ] Detectar ausencia de pista de video (probe)
- [ ] Mostrar forma de onda (canvas con picos precalculados por ffmpeg) o fondo neutro con el nombre

### Paso 4 — Sincronización
- [ ] `findActiveSegment(segments, t)` con búsqueda binaria (con test)
- [ ] Resaltar el segmento activo en TranscriptView
- [ ] Clic en un segmento → `seek(start)`

### Paso 5 — Subtítulos/CC
- [ ] Capa superpuesta con el texto del segmento activo (no `<track>`, para actualizar en vivo)
- [ ] Ocultable desde settings (`showCaptions`)

### Paso 6 — Panel y atajos
- [ ] Mostrar/ocultar panel desde la Toolbar (el audio sigue sonando)
- [ ] Altura desde settings (300–600 px)
- [ ] `Espacio` play/pausa (sin interferir con inputs), `←/→` ±5 s

### Paso 7 — Archivo no disponible
- [ ] Si el archivo original no existe: aviso + botón "Buscar archivo..." (se completa en la tarea 18)

### Paso 8 — Verificación
- [ ] Commit: `feat(player): reproductor sincronizado`

## Criterios de aceptación
- [ ] Clic en cualquier línea salta al momento exacto
- [ ] El resaltado sigue la reproducción sin saltos visibles

## Bitácora
- _(fecha — nota)_

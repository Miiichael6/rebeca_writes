# 11 · Vista previa para códecs no soportados

**Estado:** ⬜ Pendiente
**Fase:** 3 — Reproductor · **Depende de:** 07, 10 · **Doc:** §4.1 Reproductor

## Objetivo
Reproducir AVI, WMV, FLV, HEVC y demás generando en segundo plano un MP4 compatible.

## Pasos

### Paso 1 — Detección
- [ ] Usar `isChromiumPlayable` de `probe` (tarea 07)
- [ ] Si el video no es reproducible pero el audio sí → reproducir el audio de inmediato

### Paso 2 — Generación
- [ ] `services/previewCache.ts`
- [ ] `ffmpeg -i <in> -c:v libx264 -preset ultrafast -crf 28 -c:a aac -movflags +faststart <cache>/<hash>.mp4`
- [ ] Clave de caché: hash de ruta + tamaño + mtime
- [ ] Prioridad baja del proceso; no más de 1 generación a la vez
- [ ] Progreso visible en el Player ("Preparando vista previa... 42 %")
- [ ] Si el audio tampoco es reproducible: pista de audio AAC temporal primero

### Paso 3 — Cambio en caliente
- [ ] Al terminar, cambiar `src` a la vista previa manteniendo la posición y el estado de reproducción

### Paso 4 — Límite de caché
- [ ] Tamaño máximo configurable (settings, por defecto 5 GB)
- [ ] Borrar lo menos usado recientemente (LRU por `atime` / índice propio)
- [ ] `clear()` usado por "Borrar historial" y por "Vaciar caché" en Configuración

### Paso 5 — Verificación
- [ ] Probar .avi, .wmv, .flv y un .mkv HEVC
- [ ] Commit: `feat(player): vista previa para códecs no soportados`
- [ ] **Cierre de Fase 3**

## Criterios de aceptación
- [ ] Un .avi se reproduce (primero audio, luego video) sin congelar la UI
- [ ] La caché no supera el límite

## Bitácora
- _(fecha — nota)_

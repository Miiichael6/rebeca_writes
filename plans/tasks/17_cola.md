# 17 · Cola de trabajos

**Estado:** ⬜ Pendiente
**Fase:** 5 — Cola e historial · **Depende de:** 08, 12 · **Doc:** §4.2

## Objetivo
Procesar muchos archivos, uno a la vez, sin intervención, pudiendo retomar la cola tras cerrar la app.

## Pasos

### Paso 1 — Modelo de datos
- [ ] `QueueJob`: `{ id, filePath, fileName, model, language, translate, audioTrack, status, progress, error?, historyId?, addedAt }`
- [ ] Estados: `pending`, `processing`, `done`, `error`, `cancelled`
- [ ] Modelo e idioma se congelan al encolar

### Paso 2 — Servicio en main
- [ ] `services/queue.ts`: `add(files)`, `remove(id)`, `reorder(ids)`, `pause()`, `resume()`, `cancelCurrent()`, `clearCompleted()`
- [ ] Bucle: tomar el siguiente pendiente → `TranscriptionEngine` → crear/actualizar la entrada del historial → siguiente
- [ ] Un error en un trabajo no detiene la cola
- [ ] Persistir en `queue.json` en cada cambio

### Paso 3 — Opciones
- [ ] "Saltar archivos que ya tienen .srt al lado" (`<nombre>.srt` o `<nombre>.*.srt`)
- [ ] "Al terminar, guardar automáticamente el .srt junto al archivo" (usa la tarea 20)

### Paso 4 — Retomar
- [ ] Al arrancar con trabajos pendientes o en proceso → diálogo "¿Retomar la cola?" (Retomar / Descartar)
- [ ] El trabajo que estaba en proceso vuelve a `pending`

### Paso 5 — Notificación
- [ ] `new Notification()` de Windows al vaciarse la cola (N completados, M con error)
- [ ] Clic en la notificación → enfocar la app

### Paso 6 — Panel de cola (renderer)
- [ ] Lista con ícono de estado, nombre, modelo/idioma, % y mensaje de error
- [ ] Reordenar arrastrando (solo pendientes)
- [ ] Botones: Pausar/Reanudar, Cancelar actual, Limpiar completados, Quitar ítem
- [ ] Checkboxes de opciones del paso 3
- [ ] Clic en el trabajo en proceso → abre su vista en tiempo real
- [ ] Contador de pendientes en el botón Cola de la Sidebar

### Paso 7 — Verificación
- [ ] Encolar 10 archivos de formatos mixtos y dejarlos terminar solos
- [ ] Cerrar a mitad y reabrir → retomar
- [ ] Commit: `feat(queue): cola persistente`

## Criterios de aceptación
- [ ] 50 archivos se procesan uno por uno sin intervención
- [ ] Cerrar a mitad y reabrir permite retomar

## Bitácora
- _(fecha — nota)_

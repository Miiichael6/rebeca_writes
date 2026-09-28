# 17 · Cola de trabajos

**Estado:** ✅ Terminada (falta la prueba manual con archivos reales, ver Bitácora)
**Fase:** 5 — Cola e historial · **Depende de:** 08, 12 · **Doc:** §4.2

## Objetivo
Procesar muchos archivos, uno a la vez, sin intervención, pudiendo retomar la cola tras cerrar la app.

## Pasos

### Paso 1 — Modelo de datos
- [x] `QueueJob`: `{ id, filePath, fileName, model, language, translate, audioTrack, status, progress, error?, historyId?, addedAt }`
- [x] Estados: `pending`, `processing`, `done`, `error`, `cancelled`
- [x] Modelo e idioma se congelan al encolar

### Paso 2 — Servicio en main
- [x] `services/queue.ts`: `add(files)`, `remove(id)`, `reorder(ids)`, `pause()`, `resume()`, `cancelCurrent()`, `clearCompleted()`
- [x] Bucle: tomar el siguiente pendiente → `TranscriptionEngine` → crear/actualizar la entrada del historial → siguiente
- [x] Un error en un trabajo no detiene la cola
- [x] Persistir en `queue.json` en cada cambio

### Paso 3 — Opciones
- [x] "Saltar archivos que ya tienen .srt al lado" (`<nombre>.srt` o `<nombre>.*.srt`)
- [x] "Al terminar, guardar automáticamente el .srt junto al archivo" (usa la tarea 20; aquí un `toSrt` mínimo, ver Bitácora)

### Paso 4 — Retomar
- [x] Al arrancar con trabajos pendientes o en proceso → diálogo "¿Retomar la cola?" (Retomar / Descartar)
- [x] El trabajo que estaba en proceso vuelve a `pending`

### Paso 5 — Notificación
- [x] `new Notification()` de Windows al vaciarse la cola (N completados, M con error)
- [x] Clic en la notificación → enfocar la app

### Paso 6 — Panel de cola (renderer)
- [x] Lista con ícono de estado, nombre, modelo/idioma, % y mensaje de error
- [x] Reordenar arrastrando (solo pendientes)
- [x] Botones: Pausar/Reanudar, Cancelar actual, Limpiar completados, Quitar ítem
- [x] Checkboxes de opciones del paso 3
- [x] Clic en el trabajo en proceso → abre su vista en tiempo real
- [x] Contador de pendientes en el botón Cola de la Sidebar

### Paso 7 — Verificación
- [ ] Encolar 10 archivos de formatos mixtos y dejarlos terminar solos → pendiente de prueba manual (la lógica está cubierta por `tests/main/queueService.test.ts`)
- [ ] Cerrar a mitad y reabrir → retomar → pendiente de prueba manual (ídem)
- [x] Tests: `QueueService`, exportador `.srt` y reordenado (`moveJob`)
- [x] La app arranca con `npm run dev`
- [x] Commit: `feat(queue): cola persistente`

## Criterios de aceptación
- [ ] 50 archivos se procesan uno por uno sin intervención → pendiente de prueba manual
- [ ] Cerrar a mitad y reabrir permite retomar → pendiente de prueba manual

## Bitácora
- 2026-09-28 — **Datos**: `JobStatus` pasa de `completed` a `done` (tipos, íconos, CSS y la clave `queue.status.done` de los 3 idiomas). `QueueJob` gana `translate`, `audioTrack?`, `skipped?`, `historyId?` y `addedAt`. Nuevos `QueueState {jobs, paused, resumePending}`, `QueueDrainedEvent` y `QueueAddResult`. El id del trabajo de la cola es también el id del `TranscribeJob`. Se quitó `mockQueue` de mocks.ts.
- 2026-09-28 — **Servicio**: la lógica está en `services/queueService.ts` (clase `QueueService` sin Electron, con dependencias inyectadas, testeable) y la instancia real en `services/queue.ts` (`queue()`, `initQueue()`), igual que `historyStore.ts`/`history.ts`. Persiste con el `QueueStore` ya existente (`userData/queue.json`, escritura atómica con debounce). El progreso solo se avisa al renderer, no se guarda. Si `run` rechaza, el trabajo queda en `error: unknown` y la cola sigue.
- 2026-09-28 — **Motor**: `transcribeManager` gana `runTranscription(job)` (promesa que resuelve con done/error/cancelled), `waitTranscriptionIdle()`, `onTranscriptionProgress()` y `cancelAllTranscriptions()` (en `will-quit`). La cola espera a que termine una transcripción lanzada a mano antes de tomar el siguiente trabajo: nunca corren dos whisper a la vez.
- 2026-09-28 — **Historial**: la entrada se crea (o se reutiliza si ya existe para ese archivo) al empezar a procesar el trabajo, no al encolar, y se avisa al renderer con el evento nuevo `history:added` → `upsertEntry`. El renderer sigue al trabajo en proceso (`queue:changed` → `beginJob`), así su progreso y segmentos se ven igual que al transcribir a mano; los errores de trabajos de la cola no sacan toast (salen en el panel).
- 2026-09-28 — **Opciones**: "saltar si ya tiene .srt" se mira al procesar (no al encolar), con `readdir` + `hasSiblingSrt` (sin distinguir mayúsculas); el trabajo queda `done` + `skipped` ("Saltado"). "Guardar .srt automáticamente" escribe `<nombre>.<idioma>.srt` (`en` si se tradujo, `und` si el idioma era automático) y **sobrescribe** un .srt con ese nombre si ya existía; un fallo al escribir solo se registra en el log. `src/shared/exporters.ts` trae un `toSrt` mínimo que la tarea 20 ampliará.
- 2026-09-28 — **Retomar**: al arrancar, si hay pendientes, la cola no arranca y el panel muestra el diálogo (Retomar con foco; Descartar quita los pendientes y deja los terminados). Al cerrar, `queue().shutdown()` corta el guardado antes del `flushAllWrites`, así el trabajo en proceso queda `processing` en disco y `QueueStore` lo devuelve como `pending` al reabrir.
- 2026-09-28 — **Pausa**: deja terminar el trabajo en curso. Cancelar actual lo marca `cancelled` y sigue con el siguiente. Quitar no aplica al que está en proceso.
- 2026-09-28 — **Notificación**: la pide el renderer (`app:notify`) para poder traducir el texto; el main guarda la `Notification` en un Set para que el GC no se la lleve antes del clic, y el clic restaura/enfoca la ventana. Solo se avisa si hubo al menos un completado o un error desde el último aviso.
- 2026-09-28 — **Panel**: "Agregar archivos" abre el diálogo con selección múltiple (`pickMediaFiles`) y congela modelo/idioma/traducir de los ajustes actuales. Arrastrar solo entre pendientes (`lib/queueOrder.ts`), y también Alt+↑/↓ con el teclado; el reordenado se aplica al momento en el renderer y luego en el main. Clic en el trabajo en proceso abre su vista en vivo.
- 2026-09-28 — **Verificación**: tests, typecheck y lint limpios; `npm run dev` arranca (ojo: desde la terminal de VS Code hay que quitar `ELECTRON_RUN_AS_NODE`). Queda para el usuario la prueba manual con 10/50 archivos reales y la de cerrar a mitad y reabrir.

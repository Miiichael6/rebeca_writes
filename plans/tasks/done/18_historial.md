# 18 · Historial

**Estado:** ✅ Terminada (falta la prueba manual en la app, ver Bitácora)
**Fase:** 5 — Cola e historial · **Depende de:** 12 · **Doc:** §4.1 Columna izquierda, §5

## Objetivo
Una lista de transcripciones real: agrupada, filtrable, con menú contextual y un borrado seguro.

## Pasos

### Paso 1 — Datos reales
- [x] Reemplazar los mocks de `useHistoryStore` por IPC `history:list`
- [x] Seleccionar un ítem → cargar segmentos (`history:get`) y el archivo en el Player

### Paso 2 — Agrupación por fecha
- [x] `groupByDate(entries, now)`: Hoy, Ayer, Esta semana, Este mes, Anteriores (con tests) → ya existía como `groupHistory` en `lib/historyGroups.ts`

### Paso 3 — Filtro
- [x] Por nombre de archivo (en el renderer)
- [x] Por texto de la transcripción: IPC `history:search(query)` en main, sin mayúsculas ni tildes (reutiliza `normalize` de la tarea 14)
- [x] Debounce ~200 ms

### Paso 4 — Menú contextual
- [x] **Abrir**
- [x] **Mostrar en el Explorador** (`shell.showItemInFolder`)
- [x] **Volver a transcribir** (encola con los settings actuales, avisa si hay ediciones)
- [x] **Renombrar** (solo el nombre mostrado, no el archivo)
- [x] **Eliminar del historial** (con confirmación)

### Paso 5 — Borrar historial
- [x] Diálogo de confirmación
- [x] Borrar `index.json`, `<id>.json` y la caché de vistas previas
- [x] **Nunca** tocar originales ni .srt exportados (verificar en el código que solo se borra dentro de `userData`)

### Paso 6 — Archivo faltante
- [x] Al seleccionar, comprobar si `filePath` existe
- [x] Si no: mostrar la transcripción + aviso "El archivo no está disponible" + **Buscar archivo...** (actualiza `filePath`)

### Paso 7 — Indicadores
- [x] Ítem en proceso con mini progreso
- [x] Ítem con error con ícono de aviso

### Paso 8 — Verificación
- [x] Tests: `HistoryStore.search`, `filterHistory`; typecheck y lint limpios
- [x] La app arranca con `npm run dev`
- [x] Commit: `feat(history): historial completo`

## Criterios de aceptación
- [x] Borrar historial pide confirmación y no toca archivos del usuario (test `clear solo borra dentro de la carpeta del historial`)
- [ ] Filtrar por una palabra dicha en el audio encuentra la entrada → lógica cubierta por tests; falta probarlo en la app

## Bitácora
- 2026-09-28 — **Main**: canales `history:list/get/search/rename/remove/clear/relocate/showInFolder/retranscribe`. `history:get` devuelve `HistoryOpened {entry, segments, media}`; `media` es `null` si el archivo ya no está (solo se registra en `media://` si existe). Las rutas de "Mostrar en el Explorador" y "Volver a transcribir" salen del historial, nunca del renderer. Borrar una entrada o el historial saca sus rutas de la lista blanca de `media://` (`unregisterMediaPath`).
- 2026-09-28 — **Borrado seguro**: `HistoryStore.clear()` solo borra `*.json` (y sus `.tmp`/`.corrupt-*`) dentro de `userData/history/`; la caché de vistas previas se vacía con `clearPreviewCache()`. Nada fuera de `userData`.
- 2026-09-28 — **Búsqueda**: `normalize` se movió a `src/shared/normalize.ts` para que la usen igual la búsqueda de la transcripción (renderer) y `HistoryStore.search` (main). El filtro por nombre usa el nombre mostrado; el de texto va con debounce de 200 ms y descarta respuestas viejas. `filterHistory` pasó a `lib/historyFilter.ts` para poder testearlo.
- 2026-09-28 — **Renderer**: se quitó `mocks.ts`. `useHistoryStore.media[id]` distingue `null` (comprobado: no está → aviso "no disponible") de sin clave (aún no se sabe), así el aviso no parpadea mientras llega `history:get`. `ConfirmDialog` gana `initialFocus` y su cuerpo pasa de `<p>` a `<div class="dialog-text">` para poder llevar un campo (renombrar).
- 2026-09-28 — **Menú contextual**: clic derecho o Mayús+F10 sobre el ítem (con teclado se abre bajo el ítem). "Volver a transcribir" pide confirmación si hay segmentos editados y no encola dos veces una entrada que ya está pendiente o en proceso ("ya está en la cola"). Reutiliza la entrada del historial (`NewQueueFile.historyId`). Ojo: con la opción "saltar si ya tiene .srt" activa, la cola también lo salta. El nombre renombrado se ve en la lista y en el título de la transcripción.
- 2026-09-28 — **Pendiente para el usuario**: probar en la app el menú contextual, renombrar/eliminar, borrar historial, "Buscar archivo..." con un original movido y el filtro por una palabra dicha en el audio.

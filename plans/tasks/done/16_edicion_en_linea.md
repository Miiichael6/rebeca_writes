# 16 · Edición en línea de segmentos

**Estado:** ✅ Terminada
**Fase:** 4 — Transcripción en vivo · **Depende de:** 12, 13 · **Doc:** §4.1 Panel de transcripción

## Objetivo
Corregir el texto de un segmento con doble clic y guardarlo en el historial.

## Pasos

### Paso 1 — UI de edición
- [x] Doble clic en un segmento → campo editable en el lugar (textarea autoajustable)
- [x] Enter guarda, Shift+Enter hace salto de línea, Esc cancela, clic fuera guarda
- [x] Indicador sutil de "editado" en el segmento
- [x] Desactivar los atajos globales (Espacio, flechas) mientras se edita

### Paso 2 — Persistencia
- [x] IPC `history:updateSegment(id, index, text)`
- [x] Guardar `edited: true` + `originalText` para poder revertir
- [x] Opción "Restaurar original" en el menú contextual del segmento

### Paso 3 — Reglas
- [x] No permitir editar mientras ese archivo se sigue transcribiendo (o solo los segmentos ya cerrados)
- [x] "Volver a transcribir" avisa que se perderán las ediciones

### Paso 4 — Propagación
- [x] Las ediciones se reflejan en búsqueda, copiar, subtítulos y exportación (exportar aún no existe: se comprueba en la 20, ver Bitácora)

### Paso 5 — Verificación
- [x] Editar, reiniciar la app y comprobar que la edición sigue (en disco y releída por el main; la UI del historial es la 18, ver Bitácora)
- [x] Tests: `HistoryStore.updateSegment` y la edición en el store del renderer
- [x] **Cierre de Fase 4** (con 14 y 15): la app arranca con `npm run dev`
- [x] Commit: `feat(transcript): edición en línea`

## Criterios de aceptación
- [x] Las ediciones persisten (comprobado en disco tras reiniciar)
- [ ] Las ediciones se exportan → pendiente de la tarea 20 (no hay exportadores aún)

## Bitácora
- 2026-09-28 — **Datos**: `Segment` gana `originalText?`. La regla vive en `src/shared/editSegment.ts` y la usan el main (`HistoryStore.updateSegment`) y el renderer (`applySegmentEdit`), así los dos quedan iguales: la primera edición guarda el texto de whisper en `originalText`; las siguientes lo conservan; si el texto nuevo es igual al original se quitan `edited` y `originalText`. Por eso "Restaurar original" no necesita canal propio: es `history:updateSegment(id, i, originalText)`.
- 2026-09-28 — **IPC** `history:updateSegment(id, index, text)` → `Segment | null`. El main valida id (misma regex que los nombres de archivo), índice entero y texto string; `null` si la entrada o el índice no existen. Las entradas mock (mocks.ts) no están en disco, así que devuelven `null` y la edición queda solo en memoria de la sesión (`results` del store). El guardado usa el mismo `DebouncedJsonWriter` atómico del historial. Si el IPC falla, toast `transcript.editSaveFailed`.
- 2026-09-28 — **Store**: `applySegmentEdit` (store/transcript.ts, sin `window.api` para que los tests de node lo importen) reemplaza el array de segmentos en vez de mutarlo: búsqueda, copiar, unir líneas y subtítulos (`Captions` lee el mismo `segments`) se enteran solos. La llamada al IPC está en `lib/editTranscript.ts`, como `copyTranscript`.
- 2026-09-28 — **UI**: el borrador `{index, draft}` vive en `SegmentList`, no en la fila: con la virtualización la fila puede salir del DOM al desplazar sin perder lo escrito. Los manejadores son estables (`useMemo`) para no romper el `memo` de las filas; una copia en `ref` evita guardar dos veces (Enter devuelve el foco a la lista y eso dispara el `blur` del textarea). Texto vacío tras `trim` = cancelar (editar no borra segmentos). Al empezar a editar se pausa el autoscroll. En "Unir líneas" el textarea ocupa un bloque dentro del párrafo. El textarea para la propagación de clic, doble clic, menú contextual y teclas: así ni la fila salta en el video ni llegan Espacio/flechas/Ctrl+C a los atajos globales (además `KEY_OWNERS` ya excluye `textarea`).
- 2026-09-28 — **Indicador**: subrayado punteado sutil y tooltip "Editado. Original: «…»". `white-space: pre-wrap` en el texto para que se vean los saltos de Shift+Enter.
- 2026-09-28 — **Menú contextual**: `Menu` solo sabía abrirse junto a un botón, así que se ancla en un `.menu-anchor.segment-menu` fijo de tamaño cero en la posición del puntero (limitado para no salirse de la ventana). Ítems: "Editar" y, si está editado, "Restaurar original". No se abre si no se puede editar.
- 2026-09-28 — **Reglas**: no se edita el archivo que se está transcribiendo (`canEdit`): el doble clic avisa con un toast y el menú no se abre. "Volver a transcribir" (el botón Transcribir de la barra en estado listo/error) pide confirmación con `ConfirmDialog` si hay algún segmento `edited`. La opción "Volver a transcribir" del menú del historial es de la tarea 18, que ya lo tiene en sus pasos.
- 2026-09-28 — **Verificación** (dev + agent-browser por CDP): doble clic abre el campo con foco y cursor al final; crece al escribir; Shift+Enter hace salto; Enter guarda, Esc cancela, clic fuera guarda; en modo segmentos y en "Unir líneas". La búsqueda encuentra el texto editado y `transcriptText` (copiar) lo incluye. Dentro del campo las teclas no llegan a `window` (fuera, `→` sí lo maneja el reproductor). Con un trabajo simulado en vivo el doble clic no edita y sale el toast; al terminar, sí. El aviso de volver a transcribir aparece con ediciones. Los subtítulos no se pudieron ver en pantalla porque los mocks no tienen medio real; leen el mismo array del store.
- 2026-09-28 — **Persistencia tras reiniciar**: hasta la tarea 18 el renderer no lista ni abre entradas del disco, así que se sembró una entrada `done` en `userData/history/`, se editó por el IPC real y se comprobó el JSON (`edited` + `originalText`). Tras reiniciar la app, una segunda edición conservó el `originalText` leído de disco y restaurar quitó las marcas. Después se borró la carpeta de prueba. Intento previo de abrir un WAV real con el diálogo nativo vía SendKeys: descartado (el foco no era fiable).
- 2026-09-28 — **Exportación**: los exportadores son la tarea 20. Leerán los segmentos del store (manual) o del historial del main (automático de la cola), y los dos ya tienen las ediciones. Se añadió a la verificación de la 20 comprobarlo; el criterio "se exportan" queda pendiente de ella.
- 2026-09-28 — **Cierre de Fase 4**: 236 tests, typecheck, lint y prettier limpios; la app arranca con `npm run dev`.

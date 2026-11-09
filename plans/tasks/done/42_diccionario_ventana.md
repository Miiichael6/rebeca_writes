# 42 · Diccionario de reemplazos: sub-ventana para editarlo

**Estado:** ✅ Terminada (prueba manual pendiente)
**Fase:** 9 — Pulido · **Depende de:** 41 · **Doc:** petición del usuario (2026-11-08)

## Objetivo

Un diálogo para editar el diccionario de la 41 sin tocar el JSON: una tabla de palabras, un campo para probar frases en vivo, importar y exportar, y un botón para aplicar el diccionario a una transcripción que ya existe.

## Enfoque

- Diálogo dentro de la app (`ui/Dialog.tsx`), no una `BrowserWindow` aparte. Se abre desde el menú rápido («Diccionario» → «Editar palabras…») y desde Configuración → Transcripción.
- Columnas: **Se escucha como** (chips: Enter añade, × quita) · **Escribir como** · **Plural** · **Activa** · borrar.
- Los cambios se guardan solos con un pequeño retardo, igual que el resto de Configuración.

## Pasos

### Paso 1 — Diálogo y tabla
- [x] `src/renderer/src/components/DictionaryDialog/` con capas como los demás componentes: `ui/DictionaryDialog.tsx`, `ui/EntryRow.tsx`, `ui/SpokenChips.tsx`, `application/useDictionary.ts` (cargar, editar, guardar con `window.api.dictionary*`), `domain/entries.ts` (crear entrada vacía, validar: sin `written` vacío y sin formas habladas repetidas entre entradas).
- [x] Botón «Añadir palabra», búsqueda en la tabla si hay muchas, estado vacío con un ejemplo (`cua` → `QA`). Estilos con tokens de `tokens.css`, claro y oscuro.

### Paso 2 — Probar, importar y exportar
- [x] Campo «Probar»: escribes una frase y debajo se ve el resultado de `applyDictionary`, con las palabras cambiadas resaltadas.
- [x] Importar y exportar JSON y CSV (`hablado1|hablado2;escrito;plural`): parser y serializador puros en `domain/dictionaryFile.ts` con tests; al importar se fusiona con lo que hay y se avisa de cuántas palabras entraron.

### Paso 3 — Accesos y aplicar a lo ya transcrito
- [x] Menú rápido: item «Editar palabras…» junto al interruptor de la 41. Configuración → Transcripción: fila «Diccionario» con botón «Editar…».
- [x] «Aplicar diccionario» en la vista de una transcripción (menú de la `BottomBar` o de la `Toolbar`): aplica a `originalText ?? text` en los segmentos no editados y a `text` en los editados, guarda y avisa de cuántos segmentos cambió. Se puede deshacer con «Restaurar original».
- [x] Textos en es, en y pt-BR.

### Paso 4 — Verificación
- [x] Tests / typecheck / lint pasan.
- [ ] A mano: añadir `jompas, jom pas` → `home pass`, probarlo en el campo «Probar», exportar, borrar, importar; aplicar el diccionario a una transcripción vieja del historial.
- [x] `npm run dev` arranca.
- [x] Commit: `feat(diccionario): ventana para editar palabras, probar, importar/exportar y aplicar a transcripciones`

## Criterios de aceptación

- [ ] Se pueden añadir, editar, desactivar y borrar palabras, y siguen ahí al reiniciar la app.
- [ ] El campo «Probar» muestra el resultado al momento y resalta lo que cambió.
- [x] Exportar e importar el mismo archivo deja el diccionario igual. (test de ida y vuelta JSON y CSV)
- [ ] «Aplicar diccionario» corrige una transcripción del historial sin pisar las ediciones a mano.

## Bitácora

- 2026-11-08: importar/exportar con los diálogos del main; el renderer convierte y fusiona (puro, con tests). Las filas a medio rellenar no se guardan.
- 2026-11-08: «Aplicar diccionario» (botón en la BottomBar) usa las palabras activas aunque el interruptor esté apagado; los segmentos tocados se deshacen con «Restaurar original».
- 2026-11-09: cerrada a petición del usuario con la prueba a mano pendiente. Siguiente: 43 (áreas).

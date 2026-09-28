# 14 · Búsqueda en la transcripción

**Estado:** ✅ Terminada
**Fase:** 4 — Transcripción en vivo · **Depende de:** 13 · **Doc:** §4.1 Panel de transcripción

## Objetivo
Buscar sin distinguir mayúsculas ni tildes, resaltar todas las coincidencias y navegar entre ellas.

## Pasos

### Paso 1 — Normalización (con tests)
- [x] `normalize(text)`: `toLowerCase` + `normalize('NFD')` + quitar diacríticos
- [x] Mapa de índices normalizado → original para resaltar el fragmento correcto
- [x] `findMatches(segments, query)` → `{ segmentIndex, start, end }[]`
- [x] Tests: "cancion" ↔ "Canción", "ñ", mayúsculas, varias coincidencias por segmento

### Paso 2 — UI
- [x] Cuadro **Buscar...** con lupa y debounce de ~150 ms
- [x] Resaltar todas las coincidencias (`<mark>`), la actual con otro color
- [x] Contador "3 de 12" / "Sin resultados"

### Paso 3 — Navegación
- [x] Enter / ↓ → siguiente; Shift+Enter / ↑ → anterior (con vuelta al inicio)
- [x] Flechas del encabezado hacen lo mismo
- [x] `scrollToIndex` en la lista virtual
- [x] Esc limpia y devuelve el foco
- [x] `Ctrl+F` enfoca el cuadro

### Paso 4 — En vivo
- [x] Recalcular las coincidencias cuando llegan segmentos nuevos (solo sobre los nuevos)

### Paso 5 — Verificación
- [x] Commit: `feat(transcript): búsqueda`

## Criterios de aceptación
- [x] Buscar "cancion" encuentra "Canción"
- [x] La navegación funciona con miles de segmentos

## Bitácora
- 2026-09-28 — Lógica pura en `lib/search.ts`, con tests en `tests/renderer/search.test.ts`. Se quitan **todos** los diacríticos (`\p{M}` tras NFD), así que la ñ cuenta como n: "ano" encuentra "año" y "año" encuentra "ano". Es lo mismo que hace el buscar de Chromium, y con whisper es útil porque a veces escribe la palabra sin tilde. El normalizado de cada segmento se guarda en un `WeakMap` con el objeto como clave: los segmentos no se mutan, así que cambiar de consulta no vuelve a normalizar 10 000 textos.
- 2026-09-28 — Mapa de índices: por cada carácter normalizado se guarda el tramo `[start, end)` del carácter original del que sale. Hace falta porque la longitud cambia ("é" en NFD, la "İ" turca pasa a dos caracteres, emojis de dos unidades UTF-16). La consulta se recorta en los extremos, y las coincidencias dentro de un segmento no se solapan.
- 2026-09-28 — Estado en `useTranscriptSearch` (en `TranscriptView.tsx`). Las coincidencias se derivan durante el render con `updateSearch`. Si el array nuevo es el viejo con segmentos añadidos al final (mismos extremos y más largo), solo se busca en los nuevos (paso 4). Cualquier otro cambio, como otro archivo o una edición de la tarea 16 (misma longitud), vuelve a buscar en todo. Al llegar segmentos se conserva la coincidencia actual. Si antes no había ninguna y aparece una, pasa a ser la actual.
- 2026-09-28 — Scroll: el efecto depende del **objeto** de la coincidencia actual. Como `updateSearch` conserva los objetos viejos al añadir, la lista no salta mientras llegan segmentos. Se centra con `scrollToSegment(i, 'center')`. Las filas reciben `currentMatch = -1` si la actual no es suya, así `memo` solo repinta dos filas al navegar. Enter o las flechas con una consulta todavía en debounce la buscan ya y se quedan en la primera, sin avanzar. Esc limpia y devuelve el foco al elemento que lo tenía antes de entrar al cuadro (`relatedTarget`); si no había ninguno, quita el foco. Colores: `--mark-bg` nuevo en los dos temas, y la actual usa `--accent-fill`.
- 2026-09-28 — Verificado en `npm run dev` con CDP y agent-browser. Hubo que quitar `ELECTRON_RUN_AS_NODE=1`, que hereda la terminal de VS Code. Sobre la entrada de 10 000 segmentos: Ctrl+F enfoca el cuadro, "LECCION" da "1 de 617" y resalta "lección". Con Enter, ↓, ↑ y Shift+Enter se navega, con vuelta de 1 a 617 al final del archivo y de vuelta a 1. Las flechas del encabezado hacen lo mismo, "zzz" da "Sin resultados" y Esc devuelve el foco al segmento enfocado antes. En vivo (inyectando lotes con `beginJob` y `appendJobSegments` desde la consola): "Sin resultados" → "1 de 3" → "2 de 4", y la actual se mantiene. Ojo al probar por CDP: con la ventana en segundo plano, el DOM que lee `eval` puede ir un frame por detrás (el rAF está limitado); la captura siempre salió bien. Tests: 218/218, typecheck y lint limpios.

# 14 · Búsqueda en la transcripción

**Estado:** ⬜ Pendiente
**Fase:** 4 — Transcripción en vivo · **Depende de:** 13 · **Doc:** §4.1 Panel de transcripción

## Objetivo
Buscar sin distinguir mayúsculas ni tildes, resaltar todas las coincidencias y navegar entre ellas.

## Pasos

### Paso 1 — Normalización (con tests)
- [ ] `normalize(text)`: `toLowerCase` + `normalize('NFD')` + quitar diacríticos
- [ ] Mapa de índices normalizado → original para resaltar el fragmento correcto
- [ ] `findMatches(segments, query)` → `{ segmentIndex, start, end }[]`
- [ ] Tests: "cancion" ↔ "Canción", "ñ", mayúsculas, varias coincidencias por segmento

### Paso 2 — UI
- [ ] Cuadro **Buscar...** con lupa y debounce de ~150 ms
- [ ] Resaltar todas las coincidencias (`<mark>`), la actual con otro color
- [ ] Contador "3 de 12" / "Sin resultados"

### Paso 3 — Navegación
- [ ] Enter / ↓ → siguiente; Shift+Enter / ↑ → anterior (con vuelta al inicio)
- [ ] Flechas del encabezado hacen lo mismo
- [ ] `scrollToIndex` en la lista virtual
- [ ] Esc limpia y devuelve el foco
- [ ] `Ctrl+F` enfoca el cuadro

### Paso 4 — En vivo
- [ ] Recalcular las coincidencias cuando llegan segmentos nuevos (solo sobre los nuevos)

### Paso 5 — Verificación
- [ ] Commit: `feat(transcript): búsqueda`

## Criterios de aceptación
- [ ] Buscar "cancion" encuentra "Canción"
- [ ] La navegación funciona con miles de segmentos

## Bitácora
- _(fecha — nota)_

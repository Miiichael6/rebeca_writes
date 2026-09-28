# 16 · Edición en línea de segmentos

**Estado:** ⬜ Pendiente
**Fase:** 4 — Transcripción en vivo · **Depende de:** 12, 13 · **Doc:** §4.1 Panel de transcripción

## Objetivo
Corregir el texto de un segmento con doble clic y guardarlo en el historial.

## Pasos

### Paso 1 — UI de edición
- [ ] Doble clic en un segmento → campo editable en el lugar (textarea autoajustable)
- [ ] Enter guarda, Shift+Enter hace salto de línea, Esc cancela, clic fuera guarda
- [ ] Indicador sutil de "editado" en el segmento
- [ ] Desactivar los atajos globales (Espacio, flechas) mientras se edita

### Paso 2 — Persistencia
- [ ] IPC `history:updateSegment(id, index, text)`
- [ ] Guardar `edited: true` + `originalText` para poder revertir
- [ ] Opción "Restaurar original" en el menú contextual del segmento

### Paso 3 — Reglas
- [ ] No permitir editar mientras ese archivo se sigue transcribiendo (o solo los segmentos ya cerrados)
- [ ] "Volver a transcribir" avisa que se perderán las ediciones

### Paso 4 — Propagación
- [ ] Las ediciones se reflejan en búsqueda, copiar, subtítulos y exportación

### Paso 5 — Verificación
- [ ] Editar, reiniciar la app y comprobar que la edición sigue
- [ ] Commit: `feat(transcript): edición en línea`

## Criterios de aceptación
- [ ] Las ediciones persisten y se exportan

## Bitácora
- _(fecha — nota)_

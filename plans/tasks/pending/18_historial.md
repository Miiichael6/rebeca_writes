# 18 · Historial

**Estado:** ⬜ Pendiente
**Fase:** 5 — Cola e historial · **Depende de:** 12 · **Doc:** §4.1 Columna izquierda, §5

## Objetivo
Una lista de transcripciones real: agrupada, filtrable, con menú contextual y un borrado seguro.

## Pasos

### Paso 1 — Datos reales
- [ ] Reemplazar los mocks de `useHistoryStore` por IPC `history:list`
- [ ] Seleccionar un ítem → cargar segmentos (`history:get`) y el archivo en el Player

### Paso 2 — Agrupación por fecha
- [ ] `groupByDate(entries, now)`: Hoy, Ayer, Esta semana, Este mes, Anteriores (con tests)

### Paso 3 — Filtro
- [ ] Por nombre de archivo (en el renderer)
- [ ] Por texto de la transcripción: IPC `history:search(query)` en main, sin mayúsculas ni tildes (reutiliza `normalize` de la tarea 14)
- [ ] Debounce ~200 ms

### Paso 4 — Menú contextual
- [ ] **Abrir**
- [ ] **Mostrar en el Explorador** (`shell.showItemInFolder`)
- [ ] **Volver a transcribir** (encola con los settings actuales, avisa si hay ediciones)
- [ ] **Renombrar** (solo el nombre mostrado, no el archivo)
- [ ] **Eliminar del historial** (con confirmación)

### Paso 5 — Borrar historial
- [ ] Diálogo de confirmación
- [ ] Borrar `index.json`, `<id>.json` y la caché de vistas previas
- [ ] **Nunca** tocar originales ni .srt exportados (verificar en el código que solo se borra dentro de `userData`)

### Paso 6 — Archivo faltante
- [ ] Al seleccionar, comprobar si `filePath` existe
- [ ] Si no: mostrar la transcripción + aviso "El archivo no está disponible" + **Buscar archivo...** (actualiza `filePath`)

### Paso 7 — Indicadores
- [ ] Ítem en proceso con mini progreso
- [ ] Ítem con error con ícono de aviso

### Paso 8 — Verificación
- [ ] Commit: `feat(history): historial completo`

## Criterios de aceptación
- [ ] Borrar historial pide confirmación y no toca archivos del usuario
- [ ] Filtrar por una palabra dicha en el audio encuentra la entrada

## Bitácora
- _(fecha — nota)_

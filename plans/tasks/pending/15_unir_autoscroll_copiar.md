# 15 · Unir líneas, desplazamiento automático y copiar

**Estado:** ⬜ Pendiente
**Fase:** 4 — Transcripción en vivo · **Depende de:** 13 · **Doc:** §4.1 Barra inferior, §6

## Objetivo
Los tres controles de la barra inferior que afectan la vista y el texto copiado.

## Pasos

### Paso 1 — Unir líneas (función pura + tests)
- [ ] `src/shared/joinLines.ts`: `toParagraphs(segments, { pauseSec = 2, maxSentences = 5 })`
- [ ] Cortar párrafo en pausa larga entre segmentos o cada N frases
- [ ] Cada párrafo conserva el `start` de su primer segmento (para clic y resaltado)
- [ ] Tests

### Paso 2 — Vista con líneas unidas
- [ ] Activado: párrafos continuos sin marcas de tiempo por segmento
- [ ] Clic y resaltado siguen funcionando a nivel de segmento dentro del párrafo
- [ ] Desactivado: un segmento por línea con `[mm:ss]`
- [ ] Guardar la preferencia en settings

### Paso 3 — Desplazamiento automático
- [ ] Activado + reproduciendo: mantener visible el segmento activo
- [ ] Activado + transcribiendo: seguir el último segmento nuevo (si no se está reproduciendo)
- [ ] Detectar scroll manual (rueda o arrastre) → pausar el autoscroll
- [ ] Botón flotante **"Volver al actual"** que lo reactiva

### Paso 4 — Copiar
- [ ] Botón **Copiar transcripción** → `clipboard.writeText` vía IPC
- [ ] Respeta "Unir líneas" (párrafos o líneas con tiempo)
- [ ] Toast "Copiado"
- [ ] `Ctrl+C` con foco en la transcripción y sin selección copia todo; con selección, copia la selección

### Paso 5 — Verificación
- [ ] Commit: `feat(transcript): unir líneas, autoscroll y copiar`
- [ ] **Cierre de Fase 4** (junto con 14 y 16)

## Criterios de aceptación
- [ ] Los tres controles funcionan durante una transcripción en curso
- [ ] Lo copiado coincide con lo que se ve

## Bitácora
- _(fecha — nota)_

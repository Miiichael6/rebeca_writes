# 15 · Unir líneas, desplazamiento automático y copiar

**Estado:** ✅ Terminada
**Fase:** 4 — Transcripción en vivo · **Depende de:** 13 · **Doc:** §4.1 Barra inferior, §6

## Objetivo
Los tres controles de la barra inferior que afectan la vista y el texto copiado.

## Pasos

### Paso 1 — Unir líneas (función pura + tests)
- [x] `src/shared/joinLines.ts`: `toParagraphs(segments, { pauseSec = 2, maxSentences = 5 })`
- [x] Cortar párrafo en pausa larga entre segmentos o cada N frases
- [x] Cada párrafo conserva el `start` de su primer segmento (para clic y resaltado)
- [x] Tests

### Paso 2 — Vista con líneas unidas
- [x] Activado: párrafos continuos sin marcas de tiempo por segmento
- [x] Clic y resaltado siguen funcionando a nivel de segmento dentro del párrafo
- [x] Desactivado: un segmento por línea con `[mm:ss]`
- [x] Guardar la preferencia en settings

### Paso 3 — Desplazamiento automático
- [x] Activado + reproduciendo: mantener visible el segmento activo
- [x] Activado + transcribiendo: seguir el último segmento nuevo (si no se está reproduciendo)
- [x] Detectar scroll manual (rueda o arrastre) → pausar el autoscroll
- [x] Botón flotante **"Volver al actual"** que lo reactiva

### Paso 4 — Copiar
- [x] Botón **Copiar transcripción** → `clipboard.writeText` vía IPC
- [x] Respeta "Unir líneas" (párrafos o líneas con tiempo)
- [x] Toast "Copiado"
- [x] `Ctrl+C` con foco en la transcripción y sin selección copia todo; con selección, copia la selección

### Paso 5 — Verificación
- [x] Commit: `feat(transcript): unir líneas, autoscroll y copiar`
- [ ] **Cierre de Fase 4** (junto con 14 y 16) — queda para la 16, ver Bitácora

## Criterios de aceptación
- [x] Los tres controles funcionan durante una transcripción en curso
- [x] Lo copiado coincide con lo que se ve

## Bitácora
- 2026-09-28 — Paso 1: `toParagraphs` devuelve índices (`from`, `to`) además de `start`/`end`, no texto, para que la vista pueda pintar cada segmento en su `<span>`. Una frase termina en `.`, `!`, `?`, `…` (y `。！？`), aunque vaya seguida de comillas o paréntesis. El corte por N frases solo ocurre al terminar una frase, así que un párrafo nunca se parte a media frase. `paragraphText` y `paragraphOf` (búsqueda binaria de segmento → párrafo) están en el mismo archivo. `lib/transcriptText.ts` arma el texto que se copia: con "Unir líneas", párrafos separados por una línea en blanco; sin él, `[mm:ss] texto`, igual que en pantalla. La tarea 20 puede reutilizar ambos para el .txt. Tests en `tests/renderer/joinLines.test.ts`.
- 2026-09-28 — Paso 2: con "Unir líneas", cada fila virtualizada es un párrafo (`ParagraphRow`) y cada segmento, un `<span data-seg>` con su clic, su resaltado de activo y sus coincidencias de búsqueda. Sin "Unir líneas", la fila también lleva `data-seg`. `ParagraphRow` usa un comparador de `memo` propio: el array de segmentos cambia en cada lote, pero el párrafo solo se repinta si cambió alguno de sus segmentos. Las claves del virtualizador llevan el prefijo `p`/`s` para que no se mezclen las alturas medidas de los dos modos. Al alternar se recuerda el primer segmento visible (en `onScroll`) y se vuelve a él. La preferencia ya se guardaba en settings (`joinLines`/`autoScroll` desde la tarea 12); comprobado con `settings.get()` tras alternar.
- 2026-09-28 — Paso 3: `reveal(segmento)` busca primero el `[data-seg]` en el DOM y ajusta `scrollTop` si no se ve entero, lo que sirve también dentro de párrafos altos. Si no está en el DOM, usa `scrollToIndex` sobre su fila. Al reproducir, el activo se centra solo cuando sale de la vista. Si se está transcribiendo sin reproducir, la lista baja al final en cada lote. Pausan el seguimiento la rueda, el toque, un clic sobre el propio contenedor (la barra de desplazamiento), las teclas PageUp/PageDown/Home/End/↑/↓ y navegar la búsqueda: si no, el autoscroll se llevaría la vista lejos de la coincidencia. Lo reactivan el botón "Volver al actual", hacer clic en un segmento y volver a marcar la casilla. El botón solo aparece si hay algo que seguir (reproduciendo con un segmento activo, o transcribiendo).
- 2026-09-28 — Paso 4: nuevo IPC `clipboard:writeText` → `clipboard.writeText` en el main, y `lib/copyTranscript.ts`, que comparten el botón y `Ctrl+C`. `Ctrl+C` se escucha en la `<section>` de la transcripción. Si el foco está en el cuadro de búsqueda, o si hay texto seleccionado, se deja la copia nativa. `.transcript-body` tiene `tabIndex=-1` para que un clic en el hueco de la lista también le dé el foco.
- 2026-09-28 — Verificado en `npm run dev` (con `--remoteDebuggingPort` y agent-browser) sobre la entrada de 10 000 segmentos. El archivo no existe en disco, así que la reproducción se simuló con `usePlayerStore.setState({ src, playing, currentTime })`:
  - Con la reproducción en el segmento 5000, la vista salta a él, y al avanzar 40 segmentos el activo sigue visible.
  - La rueda pausa el seguimiento y aparece el botón, que al pulsarlo lleva la vista al segmento 5059. Navegar la búsqueda también lo pausa: la coincidencia no se mueve mientras avanza la reproducción.
  - Al alternar "Unir líneas" se conserva el sitio (5043 → 5042 → 5038, el inicio de su párrafo).
  - El botón copia 10 000 líneas con tiempo, o 2000 párrafos con "Unir líneas".
  - `Ctrl+C` real sin selección copia todo, y con selección copia solo la selección.
  - En vivo (con `beginJob` y `appendJobSegments`, 40 lotes), el último segmento sigue visible, la rueda pausa, "Volver al actual" retoma, y lo copiado a mitad del trabajo (184 segmentos, 13 párrafos) coincide con la vista.
  - Tests 233/233, typecheck, lint y prettier limpios.
- 2026-09-28 — El **Cierre de Fase 4** no se marca: la fase termina con la 16 (edición en línea), que sigue pendiente. El commit de esta tarea se hace igual.

# 34 · Animación y centrado del dock

**Estado:** ✅ Terminada
**Fase:** 9 — Pulido · **Depende de:** 33 · **Doc:** petición del usuario (2026-10-01)

## Objetivo

Que el dock tenga vida al mostrarse y al esconderse: sale del borde con un deslizamiento suave y la píldora crece desde la barra; al esconderse se comporta como una **gota** (se contrae, se derrama hacia el borde y se asienta como barra). Además, al pasar el ratón por la barra escondida, la píldora tiene que salir **centrada sobre la barra**, no desplazada hacia la derecha.

## Contexto

- **El desplazamiento a la derecha.** Con el dock arriba o abajo y alineado a una esquina (`topLeft`, `bottomRight`...), `dockBounds` colocaba la barra escondida (48 px) y la píldora fuera (el ancho de `dockWidth`) con el **mismo borde izquierdo** (`alignedStart` con el largo de cada una). La barra quedaba en el extremo izquierdo de la píldora y esta se extendía hacia la derecha desde ahí. En los bordes laterales no pasaba: la ventana es tan alta como la barra en los dos estados.
- **La animación de antes.** Al salir, la ventana se deslizaba en 8 fotogramas de 16 ms (~128 ms, demasiado brusco) y la píldora solo hacía un `fade-in` corto. Al esconderse, la píldora se cambiaba al instante por la franja negra y la ventana se deslizaba al borde: no había transición entre píldora y barra.
- **Quién anima qué.** La ventana del dock la mueve el main (`setBounds` fotograma a fotograma en `dockWindow.ts`); lo que se dibuja dentro (píldora, barra) lo anima el CSS del renderer. Una animación en varios tiempos necesita que los dos lados se pongan de acuerdo en la duración: de ahí una constante compartida en `@shared`.

## Enfoque

Línea de tiempo de cada transición:

| Transición | Tiempo | Main (ventana) | Renderer (contenido) |
|---|---|---|---|
| Salir | 0 → ~220 ms | Desliza de `tuckedBounds` a `dockBounds` en `SLIDE_FRAMES` (14) | `dock-pill-in`: la píldora crece (escala 0.6 → 1, opacidad 0 → 1) desde el lado del borde, con `--ease-spring` |
| Esconderse · 1 contraerse | 0 → `DOCK_CONTRACT_MS` (180 ms) | Espera quieta | `dock-pill-contract`: la píldora se encoge hacia el borde hasta 28 px (una gota) y su contenido se desvanece |
| Esconderse · 2 derramarse | 180 → ~400 ms | Desliza al borde (`tuckedBounds`) | Se ve la franja de la barra viajando con la ventana |
| Esconderse · 3 asentarse | al llegar | Coloca la ventana de la barra (`dockBounds` con `pill = null`) | `dock-bar-land`: la barra se aplasta (escala 2.6 → 0.8 → 1) y rebota hasta quedarse quieta |

Si el ratón vuelve durante la contracción, el main cancela la espera y el deslizamiento (`stopSlide`) y la píldora vuelve a salir desde donde está. Con `prefers-reduced-motion` las duraciones CSS quedan en 0 ms; solo queda la espera de `DOCK_CONTRACT_MS` del main.

## Pasos

### Paso 1 — Centrado sobre la barra

- [x] `src/main/domain/dock/edge.ts` (`topOrBottomBounds`): calcular primero dónde va la barra (`alignedStart` con `BAR_PX`) y centrar la píldora sobre ella (`barStart + (BAR_PX - width) / 2`). Escondido, el resultado es el mismo que antes; fuera, la píldora se reparte a los dos lados de la barra.
- [x] `src/renderer/src/styles/components.css`: la franja de la barra durante el deslizamiento va siempre al centro de la ventana (`left: calc(50% - 24px)`) arriba y abajo. Se quitan las tres reglas por `data-align` (`start` / `center` / `end`), que ya no hacen falta.
- [x] `tests/main/dockEdge.test.ts`: la esquina se mide con la barra escondida (`CORNER_GAP_PX` desde el extremo). Nuevo caso: en `topLeft`, `topCenter` y `bottomRight` la píldora fuera comparte centro con la barra (±1 px por redondeo).

### Paso 2 — Animación al salir

- [x] `src/main/domain/dock/slide.ts`: `SLIDE_FRAMES` de 8 a 14 (14 × 16 ms ≈ 220 ms). La curva sigue siendo `ease-out` cúbica: arranca rápido y frena al llegar.
- [x] `src/renderer/src/styles/motion.css`: `@keyframes dock-pill-in` (opacidad 0 y `scale(0.6)` al inicio).
- [x] `components.css`: `.edge-pill` usa `dock-pill-in` con `--duration-slow` y `--ease-spring` en vez del `fade-in` corto. El `transform-origin` va según el borde (`right center`, `left center`, `center top`, `center bottom`), así la píldora crece desde la barra y no desde su centro.

### Paso 3 — Retracción como una gota

- [x] `src/shared/dock.ts`: `DOCK_CONTRACT_MS = 180`, la duración de la contracción, compartida por main y renderer.
- [x] `src/main/infrastructure/electron/dockWindow.ts` (`slide`): al esconderse (`view.out === false`) espera `DOCK_CONTRACT_MS` con un `setTimeout` antes de llamar a `slideWindow`. `stopSlide` cancela la espera y el deslizamiento, por si el ratón vuelve a entrar.
- [x] `src/renderer/src/components/EdgePill/EdgePill.tsx`: hook `useContractingAsDrop(collapsed)` que, cuando `collapsed` pasa de `false` a `true`, mantiene la píldora dibujada `DOCK_CONTRACT_MS` más con la clase `edge-pill-contract`. Si vuelve a salir antes, se corta.
- [x] `motion.css`: `@keyframes dock-pill-contract` (ancho a 28 px y sin padding) y `@keyframes dock-bar-land` (escala 2.6 → 0.8 → 1, opacidad 0.6 → 1).
- [x] `components.css`: `.edge-pill-contract` anima con `ease-in` y se queda en el último fotograma (`forwards`), y sus hijos se desvanecen con `fade-out`. `.edge-pill-area` se alinea hacia el borde (`flex-end` a la derecha, `flex-start` a la izquierda, centro arriba y abajo) para que la gota se encoja hacia la barra. `.edge-pill-bar` anima con `dock-bar-land` y su `transform-origin` va en el lado del borde.

### Paso 4 — El ■ de parar al empezar a grabar

- [x] `src/renderer/src/dock/dockButtons.ts`: `DOCK_ACTION_ICON_CLASS` da a `askEnd` la clase `edge-pill-icon-stop`; `EdgePillButton` acepta `iconClass`.
- [x] `motion.css`: `stop-morph` (el `rect` del icono nace como un punto, `rx` 9 px y escala 0.3, crece con rebote a 1.15 y se vuelve un cuadrado redondeado de `rx` 3 px) y `stop-ripple` (una onda del color de grabando sale del botón y se desvanece en 600 ms).
- [x] `components.css`: el ■ va relleno (`fill: currentColor`) y sustituye el giro genérico `pill-icon-in` por su propia entrada.

### Paso 5 — El micrófono se come la onda

- [x] `DOCK_CONTRACT_MS` pasa a 320 ms y llega al CSS como `--dock-contract-ms` (estilo en línea de `DockApp`), para que main y renderer no se desfasen.
- [x] `components.css` + `motion.css`: al contraerse, la píldora se cierra hacia el botón de la derecha (el micrófono); la onda o la pregunta se encogen hacia él (`dock-eaten`), el otro botón se desvanece y el micro da un bocado (`dock-gulp`). Queda una gota con el micro.

- [x] `DOCK_DROP_HOLD_MS = 500`: ya contraída, la gota (solo el 🎤) se queda quieta medio segundo antes de que el main la deslice al borde.

- [x] Al esconderse, la ventana se desliza entera tras el borde (`tuckedBounds(..., 0)`), no hasta dejar `PEEK_PX` asomando: se veía un trozo de la gota.
- [x] La gota se desvanece (`fade-out` tras `--dock-contract-ms` + `--dock-hold-ms`) mientras se hunde, para que el cambio de la ventana a la barra no enseñe la gota un instante.

### Paso 6 — Verificación

- [x] Prueba real del centrado, arriba y abajo: en `topLeft`, `topCenter`, `topRight`, `bottomLeft`, `bottomCenter` y `bottomRight`, al pasar el ratón por la barra la píldora sale centrada sobre ella y el ratón sigue dentro (no se esconde sola).
- [x] Prueba real de salida: en un lateral (`rightCenter`) y arriba (`topCenter`) la píldora crece desde la barra, sin saltos ni parpadeo.
- [x] Prueba real de la gota: al sacar el ratón, la píldora se contrae hacia el borde, se desliza y la barra rebota al asentarse. Si se vuelve a entrar con el ratón a mitad de la contracción, la píldora vuelve a salir sin quedarse a medias.
- [x] Prueba real del ■: al empezar a grabar, el icono de parar se transforma de punto a cuadrado y sale la onda una sola vez
- [x] Prueba real con grabación y con la pregunta de la reunión: las animaciones no rompen la onda ni el texto, y el borde azul de grabando se mantiene en la gota y en la barra.
- [x] Tests (`npm run test`), `npm run typecheck` y `npm run lint` pasan
- [x] Commit: `feat(dock): animación al mostrarse y píldora centrada sobre la barra (tarea 34)`
- [x] Commit: `feat(dock): la píldora se retrae como una gota (tarea 34)`

## Criterios de aceptación

- [x] Al pasar el ratón por la barra, la píldora queda centrada sobre ella (arriba y abajo, en las esquinas y al centro)
- [x] La aparición se anima (deslizamiento + crecimiento desde la barra) y no parpadea
- [x] Al esconderse, el micrófono se come la onda y la gota que queda se derrama hacia el borde y se asienta como barra con un pequeño rebote
- [x] Al empezar a grabar, el ■ de parar aparece con una transformación moderna (punto → cuadrado + onda)
- [x] Volver a entrar con el ratón durante cualquier fase de la retracción saca la píldora de nuevo sin estados a medias

## Bitácora

- 2026-10-01 — Con la barra en una esquina, la ventana nacía en la barra y la píldora se extendía a la derecha; ahora ambas comparten centro. Prueba visual pendiente del usuario.
- 2026-10-01 — Al esconderse el usuario quiere una gota: contraerse, derramarse al borde y asentarse. La contracción la dibuja el renderer y el main retrasa `DOCK_CONTRACT_MS` el deslizamiento (cancelable si el ratón vuelve).
- 2026-10-01 — Un test de `jsonRepositories` falló una vez en la suite completa y pasó al repetirlo: intermitente, ajeno a esta tarea.
- 2026-10-01 — Bug: la barra aparecía (y rebotaba) con la ventana aún fuera y luego bajaba. Ahora la gota dura hasta el `resize` de la ventana al llegar a la barra, y solo entonces la barra se derrama a lo largo del borde (`--bar-spill-from`).
- 2026-10-01 — El usuario precisó la gota: el micrófono debe comerse la onda. El micro está siempre a la derecha (`record` o el indicador al grabar), así que la contracción se ancla al último botón.
- 2026-10-01 — Parpadeo al llegar: Windows pinta un fotograma del último dibujo al redimensionar la ventana transparente; se evita dejando la gota invisible antes de que la ventana cambie a la barra.
- 2026-10-01 — La gota queda centrada sobre la barra (antes se anclaba a la derecha) y el micro ya no "da el bocado" (crecía y encogía): se quitó `dock-gulp`.

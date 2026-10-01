# 34 · Animación y centrado del dock

**Estado:** 🔄 En progreso
**Fase:** 9 — Pulido · **Depende de:** 33 · **Doc:** petición del usuario (2026-10-01)

## Objetivo

Que el dock se anime al mostrarse (sale del borde con un deslizamiento más largo y la píldora crece desde la barra) y que, al pasar el ratón por la barra, la píldora salga centrada sobre ella en vez de irse hacia la derecha.

## Pasos

### Paso 1 — Centrado

- [x] `src/main/domain/dock/edge.ts`: arriba y abajo la píldora se centra sobre la barra escondida (en esquina y al centro)
- [x] `src/renderer/src/styles/components.css`: la barra del paso intermedio va siempre al centro de la ventana (quitadas las reglas por alineación)
- [x] `tests/main/dockEdge.test.ts`: la píldora sale centrada sobre la barra

### Paso 2 — Animación

- [x] `src/main/domain/dock/slide.ts`: `SLIDE_FRAMES` de 8 a 14 (≈ 220 ms) para un deslizamiento más suave
- [x] `motion.css` + `components.css`: `dock-pill-in` (opacidad y escala desde el lado del borde) al aparecer la píldora

### Paso 3 — Retracción como una gota

- [x] `DOCK_CONTRACT_MS` en `src/shared/dock.ts`: el main espera ese rato antes de deslizar al esconderse
- [x] `EdgePill`: al esconderse, la píldora se contrae hasta ser una gota (`dock-pill-contract`) y luego aterriza como barra (`dock-bar-land`)

### Paso 4 — Verificación

- [ ] Prueba real: en cada posición la píldora sale centrada sobre la barra y la animación se ve fluida
- [x] Tests, `npm run typecheck` y `npm run lint` pasan
- [x] Commit: `feat(dock): animación al mostrarse y píldora centrada sobre la barra (tarea 34)`

## Criterios de aceptación

- [ ] Al pasar el ratón por la barra, la píldora queda centrada sobre ella (arriba y abajo)
- [ ] Al esconderse, la píldora se contrae como una gota, se derrama hacia el borde y se asienta como barra
- [ ] La aparición se anima (deslizamiento + crecimiento) y no parpadea

## Bitácora

- 2026-10-01 — Con la barra en una esquina, la ventana nacía en la barra y la píldora se extendía a la derecha; ahora ambas comparten centro. Prueba visual pendiente del usuario.
- 2026-10-01 — Al esconderse el usuario quiere una gota: contraerse, derramarse al borde y asentarse. La contracción la dibuja el renderer y el main retrasa `DOCK_CONTRACT_MS` el deslizamiento (cancelable si el ratón vuelve).

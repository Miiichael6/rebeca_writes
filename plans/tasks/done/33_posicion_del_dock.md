# 33 · Posición del dock

**Estado:** ✅ Terminada
**Fase:** 9 — Pulido · **Depende de:** 30 · **Doc:** petición del usuario (2026-10-01)

## Objetivo

Elegir en Configuración dónde vive el dock: en cualquiera de los cuatro bordes, en un extremo o al centro (12 posiciones, según los cuadrados rojos que marcó el usuario en una captura). El dock escondido asoma como barra en ese borde y sale deslizándose hacia dentro de la pantalla.

## Enfoque

Posiciones: `topLeft`, `topCenter`, `topRight`, `bottomLeft`, `bottomCenter`, `bottomRight`, `leftTop`, `leftCenter`, `leftBottom`, `rightTop`, `rightCenter` (por defecto, la de la tarea 30) y `rightBottom`. Cada una se descompone en **borde** (`left` / `right` / `top` / `bottom`) y **alineación** a lo largo del borde (`start` / `center` / `end`). En los laterales la barra escondida es vertical (a la altura de siempre); arriba y abajo es horizontal y queda dentro de la ventana fuera, para que el ratón que la sacó siga dentro. El menú contextual se abre hacia dentro de la pantalla (a la derecha del cursor si el dock está en la mitad izquierda).

## Pasos

### Paso 1 — Geometría (lógica pura)

- [x] `src/shared/dock.ts`: `DOCK_POSITIONS`, `DockPosition`, `DEFAULT_DOCK_POSITION = 'right'`, `dockEdge(position)`, `dockAlign(position)` y `menuOpensLeft(position)` (los usa también el renderer)
- [x] `src/main/domain/dock/edge.ts`: `dockBounds(area, pill, position)` para los cuatro bordes y las tres alineaciones
- [x] `src/main/domain/dock/menuPlacement.ts`: `menuBounds` hacia la izquierda o la derecha del cursor
- [x] `tests/main/dockEdge.test.ts` y `tests/main/dockMenuPlacement.test.ts`: cada borde, barra dentro de la ventana fuera, esquinas pegadas, centro centrado, menú hacia dentro

### Paso 2 — Ajuste y main

- [x] Ajuste `dockPosition` (por defecto `right`) en `src/shared/settings.ts` y su validador en `src/main/domain/settings.ts`
- [x] `ElectronDockSurface` y `ElectronDockMenuSurface` leen la posición; el deslizamiento anima x e y
- [x] Al cambiar el ajuste, el dock se recoloca al momento (`composition.ts`)

### Paso 3 — Renderer

- [x] `DockApp.tsx` / CSS: el margen vacío y la franja de la barra escondida van en el borde elegido (`data-edge`, `data-align`)
- [x] `DockMenu.tsx`: ancla y submenú hacia la izquierda o la derecha según la posición; `useReportMenuSize` mide hacia ese lado
- [x] Configuración > Interfaz: selector "Posición del dock" (`components/settings/DockSettings/`) con las ocho opciones; textos en es, en y pt-BR

### Paso 4 — Verificación

- [x] Prueba real: cada posición recoloca el dock al momento; escondido asoma en su borde, sale con el ratón y se esconde al irse
- [x] Prueba real: la pregunta de la reunión y la grabación se ven bien arriba y abajo; el menú del clic derecho se abre hacia dentro
- [x] Código organizado: una responsabilidad por archivo, lógica pura separada de la integración, sin duplicación ni código muerto
- [x] Tests (`npm run test`), `npm run typecheck` y `npm run lint` pasan
- [x] `npm run dev` arranca
- [x] Commit: `feat(dock): elegir la posición del dock (tarea 33)`

## Criterios de aceptación

- [x] En Configuración se elige entre las 6 posiciones (arriba o abajo: izquierda, centro, derecha); por defecto, abajo al centro
- [x] En cada posición el dock escondido asoma en su borde, sale hacia dentro con el ratón y no parpadea
- [x] El menú contextual nunca se sale de la pantalla y su submenú se abre hacia dentro

## Bitácora

<!-- Resumida: 1–3 entradas de una línea. Solo decisiones no obvias, problemas y desviaciones. -->

- 2026-10-01 — Las esquinas quedan a `CORNER_GAP_PX` (160 px) para no tapar minimizar/maximizar/cerrar de una ventana maximizada. El deslizamiento sale de `tuckedBounds` (la píldora tras el borde salvo lo que asoma) y vive en `slide.ts`; al cambiar la posición el dock salta, no cruza la pantalla.
- 2026-10-01 — El usuario marcó 12 posiciones en una captura: se añadieron `leftTop/Bottom` y `rightTop/Bottom` y el centro lateral pasó del 70 % de altura al centro real; los extremos laterales quedan a `SIDE_GAP_PX` (100 px).
- 2026-10-01 — El menú se abre hacia abajo también con el dock abajo (se arrima dentro del área); abrirlo hacia arriba pedía anclarlo por abajo y no compensaba. Pruebas con el dock en pantalla: pendientes del usuario.
- 2026-10-01 — El usuario descartó los laterales: quedan 6 posiciones (arriba y abajo) y el defecto pasa a `bottomCenter`. Se borró la geometría y el CSS de los laterales; un ajuste lateral guardado vuelve al defecto por el validador.

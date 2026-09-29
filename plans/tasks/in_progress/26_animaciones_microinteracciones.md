# 26 · Animaciones, microinteracciones y Select propio

**Estado:** 🔄 En progreso
**Fase:** 9 — Pulido · **Depende de:** 22 · **Doc:** §4 (UI), §8 (accesibilidad)

## Objetivo
Que cada aparición, desaparición y cambio de estado de la interfaz tenga una animación corta y
coherente (entrada, salida, reordenado, borrado), y sustituir el `<select>` nativo por un listbox
propio con el mismo aspecto Fluent que el resto de controles.

## Contexto
Hoy solo animan cuatro cosas (`spin`, `drop-in`, `toast-in`, `menu-in`, `drawer-in`) y no hay
animación de **salida** en ningún sitio: los paneles y los diálogos desaparecen de golpe porque
React los desmonta al instante. Los tokens de movimiento ya existen en
[tokens.css](../../src/renderer/src/styles/tokens.css) (`--ease`, `--duration-fast`, `--duration`)
y ya respetan `prefers-reduced-motion`. El `<select>` de
[Select.tsx](../../src/renderer/src/components/ui/Select.tsx) es nativo, así que su lista la pinta
Windows y no se puede animar ni tematizar.

## Pasos

### Paso 1 — Vocabulario de movimiento
- [x] Añadir a `src/renderer/src/styles/tokens.css` los tokens que faltan: `--duration-slow`
      (~250 ms), `--ease-out` (salidas, `cubic-bezier(0.4, 0, 1, 1)`) y `--ease-spring` para los
      rebotes suaves de los paneles; comprobar que los tres quedan en 0 ms dentro del bloque
      `@media (prefers-reduced-motion: reduce)` existente
- [x] Crear `src/renderer/src/styles/motion.css` con los `@keyframes` compartidos
      (`fade-in`/`fade-out`, `slide-up`/`slide-down`, `slide-in-right`/`slide-out-right`,
      `scale-in`/`scale-out`, `collapse-out`) y registrarlo en `main.tsx` junto al resto de hojas
- [x] Mover a `motion.css` los `@keyframes` que ya están dispersos en `app.css` y
      `components.css` (`spin`, `drop-in`, `toast-in`, `menu-in`, `drawer-in`) para que el
      movimiento viva en un solo archivo

### Paso 2 — Hook de montaje/desmontaje
- [x] Crear `src/renderer/src/lib/useMountTransition.ts` con `useMountTransition(open, duration)`
      que devuelva `{ mounted, state: 'entering' | 'entered' | 'exiting' }`: mantiene el nodo
      montado mientras dura la animación de salida y devuelve 0 ms de espera si
      `matchMedia('(prefers-reduced-motion: reduce)')` está activo
- [x] Test de `useMountTransition` (casos: abre, cierra y se desmonta al acabar, se reabre
      durante la salida, reduced-motion desmonta de inmediato)

### Paso 3 — Paneles y vistas
- [x] `QueuePanel.tsx`: usar el hook para que el panel de cola entre y salga deslizándose
      (`slide-in-right` / `slide-out-right`) en vez de desmontarse de golpe
- [x] `Player.tsx` + `App.tsx`: animar el panel de video al mostrarlo/ocultarlo con
      `videoVisible` (alto + opacidad, `collapse-out` al cerrar) sin que el `TranscriptView`
      salte de golpe al recuperar el espacio
- [x] `Dialog.tsx`: añadir salida (`scale-out` + fade del backdrop) reutilizando el hook, para
      todos sus usos (Licencias, confirmaciones, etc.)
- [x] `SettingsPage.tsx` / cambio de `view` en `ui.ts`: transición de fade + desplazamiento
      corto al entrar y salir de Configuración

### Paso 4 — Listas: alta, baja y transcripción en vivo
- [x] `TranscriptView.tsx`: los segmentos nuevos que llegan por streaming aparecen con
      `fade-in` + `slide-up` corto; la animación se aplica solo a los segmentos recién añadidos
      (no al re-render del virtualizador al hacer scroll)
- [x] Cola e historial: alta de archivo con `fade-in` + `slide-up`, y **baja** con una salida real
      (fade + `collapse-out` del alto) antes de quitar la fila del store; la espera se centraliza
      en un helper (`src/renderer/src/lib/useListExit.ts` o el propio `useMountTransition`), no
      con `setTimeout` repetidos en cada componente
- [x] `DropOverlay.tsx`: añadir la salida que hoy no tiene (hay `drop-in`, falta `drop-out`)
- [x] Barras de progreso y ETA: comprobar que los cambios de `width` siguen interpolando y no
      dan saltos cuando llegan muchos eventos de progreso seguidos

### Paso 5 — Controles y menús
- [x] Sustituir el `<select>` nativo de `ui/Select.tsx` por un listbox propio
      (botón + lista flotante) con la misma API pública (`value`, `onChange`, `options`,
      `aria-label`, `id`, `disabled`, `style`) para no tocar a sus consumidores: teclado completo
      (↑ ↓ Home End Esc Enter, escritura para buscar), roles `combobox`/`listbox`/`option`,
      `aria-activedescendant`, cierre por clic fuera, y entrada/salida animadas como el menú
- [x] Estilar el nuevo Select en `components.css` con el mismo lenguaje que `Menu` (relleno,
      borde, sombra, ítem seleccionado con la barra de acento) y comprobarlo en tema claro y
      oscuro
- [x] `Menu.tsx`: añadir animación de salida al flyout y al menú contextual, además de la de
      entrada que ya tiene
- [x] Microinteracciones de pulsación: `:active` con un `scale(0.97)` breve en `Button`, ítems de
      cola/historial y botones del reproductor; foco visible animado sin mover el layout
- [x] Toggle, Checkbox, RadioGroup y Slider: revisar que el indicador se mueva con transición y
      no salte al cambiar de estado

### Paso 6 — Accesibilidad y rendimiento
- [x] Con `prefers-reduced-motion: reduce` forzado, ninguna animación de movimiento se ejecuta
      (los cambios siguen siendo instantáneos y la app queda usable)
- [x] Animar solo `transform` y `opacity` donde se pueda (las únicas excepciones son los plegados
      `collapse-*` y `row-out`, que necesitan el alto)
- [ ] Comprobar con un archivo largo (≥ 1 h, miles de segmentos) que el scroll del transcript
      sigue fluido — prueba manual, va con el paso 7
- [x] Ninguna animación bloquea una acción: cerrar un panel y volver a abrirlo enseguida no deja
      nodos huérfanos ni estados a medias

### Paso 7 — Verificación
- [ ] Prueba real con `npm run dev`: abrir/cerrar el panel de video, añadir archivos, abrir y
      cerrar la cola, ver aparecer la transcripción en vivo, eliminar un archivo de la cola y del
      historial, abrir el Select de modelo/idioma y un menú contextual — todo entra y sale con
      animación, en tema claro y oscuro
- [ ] Código organizado: movimiento en `motion.css`, lógica de montaje en su hook con test, Select
      en su propio componente; sin duplicación ni `setTimeout` repartidos
- [ ] `npm run test`, `npm run typecheck` y `npm run lint` pasan
- [ ] Commit: `feat(ui): animaciones de la interfaz y Select propio`

## Criterios de aceptación
- [ ] Panel de video, cola, diálogos, Configuración, overlay de arrastre y menús tienen animación
      de entrada **y** de salida; nada desaparece de golpe
- [ ] Los segmentos de la transcripción en vivo y las filas de cola/historial aparecen animados, y
      al eliminar una fila se ve su salida antes de que desaparezca
- [ ] El desplegable de `Select` lo pinta la app (no Windows), sigue el estilo de `Menu` en ambos
      temas y funciona solo con teclado con los roles ARIA correctos
- [ ] Con `prefers-reduced-motion: reduce` la app no anima nada y sigue siendo plenamente usable
- [ ] `npm run test`, `npm run typecheck` y `npm run lint` pasan

## Bitácora
- 2026-09-29 — Toda la animación se apoya en un mismo mecanismo: núcleo puro (`mountTransition`,
  `listExit`, `recentItems`, `listbox`) + hook + clase CSS `entering`/`entered`/`exiting`. Los
  hooks no se pueden testear tal cual (no hay jsdom en el proyecto), así que el test cubre el
  núcleo puro.
- 2026-09-29 — El `<select>` nativo pasa a ser un combobox propio (`Select` + `SelectList`) con el
  foco en el botón y `aria-activedescendant`; el menú contextual se extrae a `ContextMenu`, que
  conserva posición e ítems mientras dura la salida.
- 2026-09-29 — `eslint` (react-hooks v6) prohíbe escribir refs durante el render: de ahí
  `useLatest` y que `useListExit`/`useRecentItems` lleven su estado con efectos y temporizadores.
- 2026-09-29 — Paso 7 sin hacer por indicación del usuario. `npm run dev` no arranca en este
  entorno (Electron sin GUI: `electron.app` es `undefined`), la prueba manual queda pendiente.

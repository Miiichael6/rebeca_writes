# 30 · Dock en el borde de la pantalla

**Estado:** ✅ Terminada
**Fase:** 9 — Pulido · **Depende de:** 29 · **Doc:** petición del usuario (2026-10-01)
**Código de origen:** el dock de la tarea 49 de Rebecca Listen (`../rebecca_listen/`): `src/main/dock/{edge,dockWindow,index}.ts`, `src/main/ipc/dock.ts`, `src/shared/dock.ts`, `src/renderer/src/components/EdgePill/` y `src/renderer/src/windows/Dock/`

## Objetivo

Una píldora con el aspecto de la de Rebecca Listen, con sus animaciones, vive escondida en el borde derecho de la pantalla (solo asoma una barra) y sale al pasar el ratón. Desde ella se graba (sus botones y un menú contextual propio con estilo Windows 11), y la app sigue en segundo plano al cerrar la ventana: el dock queda escondido en el borde y su menú vuelve a abrir RebeccaWrites.

## Enfoque

Se copia el dock de Listen con el mismo aspecto, tamaños y movimiento (`edge.ts`, la ventana transparente que se desliza fotograma a fotograma, `EdgePill` con la onda animada y `ask()` para las preguntas sí/no), adaptado a la arquitectura de aquí: geometría pura en `domain/`, caso de uso en `application/`, ventanas Electron en `infrastructure/electron/` y estilos en CSS plano con los tokens (sin CSS modules). La detección de llamadas de Listen no se trae.

El menú contextual no es el nativo: es el `Menu` de la app (Fluent, con submenú e iconos) en una ventana propia transparente que se abre junto al cursor, porque la del dock es demasiado pequeña para contenerlo.

**Contenido de la píldora (D8):**

| Estado                | Izquierda                                 | Centro          | Derecha                                                                         |
| --------------------- | ----------------------------------------- | --------------- | ------------------------------------------------------------------------------- |
| Sin grabar            | —                                         | onda quieta     | 🎤 empieza a grabar con la fuente y el micrófono elegidos en el botón de grabar |
| Grabando (borde azul) | ■ pregunta si terminar                    | onda moviéndose | 🎤 (indicador, sin acción)                                                      |
| Tras pulsar ■         | ✕ cancela y vuelve a la vista de grabando | "¿Terminar?"    | ✓ para y guarda (MP3 + entrada, como el botón de grabar)                        |

**Salir (D9):** "Salir" en el menú contextual pregunta en la píldora "¿Salir de RebeccaWrites?" (✕ / ✓). Con ✓ el proceso termina del todo, sin dejar rastro: ni ventanas, ni dock, ni procesos hijos (`rl-capture`, `ffmpeg`, `whisper-cli`) ni temporales de la sesión. Si estaba grabando, la pregunta lo dice y la grabación se guarda antes de salir.

## Pasos

### Paso 1 — Geometría, vista y respuestas (lógica pura)

- [x] `src/shared/dock.ts`: `DockView` (`question`, `out`); sin imports de `electron`, lo usa el renderer
- [x] `src/main/domain/dock/edge.ts`: copia de `edge.ts` de Listen (`DOCK_SIZE`, `PEEK_PX`, `BAR_PX`, `MARGIN_PX`, `dockBounds`, `contains`, `slidePath` con la curva de salida)
- [x] `src/main/domain/dock/dockAction.ts`: qué botones muestra la píldora y qué hace cada uno según haya pregunta o grabación (`record`, `askEnd`, `stopAndSave`, `keepRecording`, `quit`), como `quickAction` de Listen
- [x] `tests/main/dockEdge.test.ts` (los de `edge.test.ts` de Listen) y `tests/main/dockAction.test.ts`

### Paso 2 — Dock (main)

- [x] `src/main/infrastructure/electron/dockWindow.ts`: `createDockWindow()` (transparente, sin marco, siempre encima a nivel `screen-saver`, fuera de la barra de tareas, `focusable: false`, `sandbox: true`, carga el renderer en `#/dock`), `slideDock()` (8 fotogramas de 16 ms con la curva de `slidePath`) y `cursorOnDock()`, copiados de Listen
- [x] `src/main/application/dock.ts`: clase `Dock` con `open()`, `close()`, `view()`, `hover()`, `press(button)`, `ask(text)` y la vigilancia del ratón para esconderse (`HIDE_DELAY_MS`, `WATCH_MS`); la ventana entra por un puerto (`application/ports/dockSurface.ts`: `slide(out)`, `cursorInside()`, `show(view)`), con `dockWindow.ts` de adaptador
- [x] Botones de D8 conectados a `MicRecording` (empezar con la fuente y el micrófono de ajustes, parar y guardar). El nombre de la grabación lo traduce el renderer del dock, como hace el botón de grabar
- [x] `tests/main/dock.test.ts`: sale con el ratón y se esconde pasado el retraso; 🎤 sin grabar, ■ grabando; "¿Terminar?" con ✓ y con ✕; "¿Salir?" con ✓ y con ✕; una pregunta nueva retira la anterior; sin ventana del dock no falla.

### Paso 3 — Menú contextual propio

- [x] `src/main/infrastructure/electron/dockMenuWindow.ts`: ventana transparente sin marco, siempre encima y fuera de la barra de tareas, que carga `#/dock-menu` junto al cursor (y se recoloca si no cabe en la pantalla); se cierra al perder el foco, con Esc o al elegir
- [x] Ítems: "Abrir RebeccaWrites"; "Grabar ▸" con submenú Sistema / Micrófono / Ambos (con sus iconos, la fuente elegida marcada; mientras graba pasa a "Parar y guardar"); "Salir" según D9
- [x] Renderer `src/renderer/src/dock/DockMenu.tsx`: el `Menu` de la app (`components/ui/Menu.tsx`, submenú incluido) en modo ventana, que avisa al main del tamaño que ocupa para ajustar la ventana
- [x] Elegir una fuente del submenú la guarda en ajustes (`recordingSource`) y empieza a grabar con ella

### Paso 4 — Segundo plano

- [x] `src/main/index.ts`: abrir el dock al arrancar; cerrar la ventana principal ya no sale de la app (el dock la mantiene viva) y el dock queda escondido
- [x] `MainWindow.show()` en `mainWindow.ts`: si la ventana está cerrada la vuelve a crear; si está minimizada la restaura y la enfoca. Lo usan el menú del dock, `second-instance` (abrir la app otra vez, "Abrir con" y el `--live-start` de Listen) y las notificaciones
- [x] Salir de verdad (D9), tras confirmar en la píldora: `app.quit()` pasa por `before-quit` (se guarda lo pendiente, se para la grabación guardándola, se cancelan transcripciones y vistas previas, se cierra el sidecar) y destruye el dock y la ventana del menú; comprobar en el Administrador de tareas que no queda ningún proceso de la app ni hijo suyo
- [x] Revisar que la cola, la sesión en vivo y la grabación del micrófono siguen con la ventana cerrada, y que al reabrirla el renderer recupera su estado (historial, cola, grabación en curso)

### Paso 5 — IPC y preload

- [x] Canales `dock:get`, `dock:hover`, `dock:press`, `dock:openMenu`, `dock:menuAction`, `dock:menuSize` y evento `dock:view` en `src/shared/ipc.ts` (`AppApi`), handlers en `src/main/ipc.ts`, funciones tipadas en `src/preload/index.ts`

### Paso 6 — Renderer del dock

- [x] `components/EdgePill/`: presentacional, a partir de `EdgePill.tsx` de Listen, con botón izquierdo opcional (■ / ✕), onda o pregunta en el centro y a la derecha 🎤 (botón sin grabar, indicador grabando) o ✓ con iconos de `lucide-react` (`Mic`, `Square`, `X`, `Check`); estilos en `styles/components.css` con los mismos colores y medidas
- [x] Animaciones de Listen: la onda queda quieta sin grabar y ~~rebota mientras graba (`bounce`, 900 ms alternado con retraso por barra)~~ sigue el nivel del sonido grabado (`mic:level`, el `useWave` del botón de grabar) y la píldora aparece con un fundido corto al salir; con `prefers-reduced-motion` la onda queda quieta, como el resto de animaciones de la app (tarea 26)
- [x] Grabando: borde de la píldora y de la barra escondida en **azul** (token nuevo en `tokens.css`, en claro y oscuro)
- [x] `src/renderer/src/dock/DockApp.tsx` + `application/useDock.ts`: sigue `dock:view` y el estado de grabación (`store/mic.ts`), manda ratón, botones y clic derecho (abre el menú)
- [x] `main.tsx`: con `#/dock` monta `DockApp` y con `#/dock-menu` `DockMenu` (fondo transparente) en vez de la app
- [x] Textos del dock (títulos de los botones, "¿Terminar?", "¿Salir de RebeccaWrites?" y el menú) en es, en y pt-BR
- [x] El menú contextual del dock, más compacto que los de la ventana; el dock no se esconde mientras su menú está abierto (petición del usuario)
- [x] El largo de la píldora se ajusta a lo que muestra (`domain/dock/dockWidth.ts`): sin hueco para el botón que no está; crece grabando y con pregunta (petición del usuario)

### Paso 7 — Verificación

- [x] Prueba real: la barra asoma en el borde derecho; con el ratón la píldora sale deslizándose y al irse vuelve al borde
- [x] Prueba real: sin grabar se ve onda quieta + 🎤; 🎤 graba (borde azul, ■ · onda moviéndose · 🎤, texto en vivo en la entrada); ■ pregunta "¿Terminar?": ✕ vuelve a ■ · onda · 🎤 sin cortar la grabación, ✓ para y guarda el MP3
- [x] Prueba real: clic derecho abre el menú con estilo de la app; "Grabar ▸" Sistema / Micrófono / Ambos graba con esa fuente; "Abrir RebeccaWrites" abre la ventana
- [x] Prueba real: cerrar la ventana deja la app viva con el dock escondido; grabar desde el dock con la ventana cerrada y reabrirla muestra la grabación en curso
- [x] Prueba real: abrir RebeccaWrites otra vez (acceso directo) con la ventana cerrada la reabre y no crea un segundo dock; "Salir" pregunta y, al confirmar, no queda ningún proceso en el Administrador de tareas
- [x] Código organizado: una responsabilidad por archivo, lógica pura separada de la integración, sin duplicación ni código muerto
- [x] Tests (`npm run test`), `npm run typecheck` y `npm run lint` pasan; `npm run dev` arranca
- [x] Commit: `feat(dock): dock en el borde con la app en segundo plano (tarea 30)`

## Criterios de aceptación

- [x] El dock tiene el mismo aspecto y movimiento que el de Rebecca Listen: escondido en el borde derecho, sale deslizándose con el ratón y se esconde al irse
- [x] Se graba desde el dock con 🎤 o con el menú (Sistema / Micrófono / Ambos); mientras graba el borde es azul; ■ pide confirmación ("¿Terminar?") antes de parar y guardar
- [x] Cerrar la ventana no cierra la app: queda el dock escondido y lo que se estaba haciendo (cola, grabación) sigue; el menú del dock la vuelve a abrir
- [x] "Salir" del menú pide confirmación y cierra la app del todo, sin procesos ni ventanas que queden vivos

## Bitácora

<!-- Resumida: 1–3 entradas de una línea. Solo decisiones no obvias, problemas y desviaciones. -->

- 2026-10-01 — D8 resuelta por el usuario: ✓/✕ deciden grabar, guardar o terminar sin guardar (con confirmación); borde azul al grabar; menú contextual propio (no el nativo) con "Grabar ▸" Sistema / Micrófono / Ambos; se mantienen el deslizamiento y las animaciones de Listen.
- 2026-10-01 — D9 resuelta: "Salir" en el menú, con confirmación, cierra todo sin rastro. Píldora cambiada a petición del usuario: sin grabar onda quieta + 🎤; grabando ■ · onda · ✓; ■ pregunta "¿Terminar?" (✕ / ✓). ✕ ya no esconde la píldora (se esconde sola al quitar el ratón).
- 2026-10-01 — Grabando pasa a ■ · onda · 🎤; "¿Terminar?" ✓ para y guarda, ✕ vuelve a la vista de grabando. Ya no hay terminar sin guardar, así que no hace falta descartar grabaciones.
- 2026-10-01 — Probado de verdad: dock, menú y submenú, 🎤 graba (borde azul, MP3 guardado), "Salir" ✕/✓ sin procesos. Falta probar a mano ■ "¿Terminar?", grabar desde el submenú y cerrar/reabrir la ventana: el ratón automático chocaba con la sesión del usuario. Preguntas cortas ("¿Salir?") con el texto completo en el tooltip; el azul va en los temas, no en `tokens.css`; `npm run dev` necesita `ELECTRON_RUN_AS_NODE` sin definir.
- 2026-10-01 — La onda grabando ya no rebota con `bounce`: dibuja los últimos niveles de `mic:level`, como el botón de grabar (petición del usuario).
- 2026-10-01 — Las pruebas que faltaban (■ "¿Terminar?", submenú de fuentes, cerrar/reabrir la ventana, onda y menú) las hizo el usuario: todo ok.

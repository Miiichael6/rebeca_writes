# 31 · Atajo de teclado para grabar

**Estado:** ✅ Terminada
**Fase:** 9 — Pulido · **Depende de:** 30 · **Doc:** petición del usuario (2026-10-01)

## Objetivo

Grabar desde cualquier app con un atajo global, sin tocar el dock: mantener **Ctrl+Win** graba mientras está pulsado (al soltar, para y guarda), y **Ctrl+Win, Win** (doble pulsación) deja grabando en manos libres. El atajo se cambia o se desactiva en Configuración.

## Enfoque

`globalShortcut` de Electron no sirve: no registra combinaciones solo de modificadores (Ctrl+Win) ni avisa al soltar. Se usa un gancho de teclado de bajo nivel (`WH_KEYBOARD_LL`) en un binario nuevo del crate de `native/` (`rl-hotkey.exe`), que vive mientras vive la app y solo informa al main de cuándo se pulsa y se suelta la combinación configurada. Qué gesto es (mantener o doble pulsación) lo decide el main con lógica pura y testeable.

**Gestos (D10):**

| Gesto                                                    | Sin grabar                                                     | Grabando                                                   |
| -------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- |
| Mantener Ctrl+Win más de `HOLD_START_MS`                 | Graba con la fuente elegida; al soltar **para y guarda** (MP3) | Nada                                                       |
| Ctrl+Win y otra pulsación de Win en `DOUBLE_PRESS_MS`    | Graba en manos libres (se para con ■ del dock o el botón)      | Nada                                                       |
| Pulsar y soltar Ctrl+Win (sin otra tecla)                | Nada                                                           | Para la grabación en manos libres (o la del dock) y guarda |
| Ctrl+Win + otra tecla (p. ej. Ctrl+Win+→ de escritorios) | Nada: no es el atajo y no se le quita a Windows                | Nada                                                       |

El dock sale mientras se graba por el atajo, con el borde azul y la onda en vivo de la tarea 30.

## Pasos

### Paso 1 — Gestos (lógica pura)

- [x] `src/main/domain/hotkey/gesture.ts`: máquina de estados que recibe `down`/`up`/`otherKey` con su hora y devuelve `startHold`, `stopHold`, `startLatched` o nada (`HOLD_START_MS`, `DOUBLE_PRESS_MS` con nombre)
- [x] `src/shared/shortcut.ts` (lo usa también Configuración) + `src/main/domain/hotkey/accelerator.ts`: validar y normalizar la combinación guardada (al menos un modificador, sin repetidas) y pasarla al formato del sidecar
- [x] `tests/main/hotkeyGesture.test.ts` y `tests/main/hotkeyAccelerator.test.ts`: mantener y soltar, toque corto que no graba, doble pulsación, otra tecla en medio, soltar antes de `HOLD_START_MS`

### Paso 2 — Sidecar del teclado (Rust)

- [x] `native/src/bin/rl-hotkey/` (segundo binario del crate: `main.rs`, `command.rs`, `event.rs`, `combo.rs` puro con tests, `hook.rs`): `WH_KEYBOARD_LL` en su propio hilo con bucle de mensajes; comandos por stdin (`watch` con la combinación, `off`) y eventos JSON por stderr (`down`, `up`, `other`), como `rl-capture`
- [x] Que soltar Win tras el atajo no abra el menú Inicio (pulsación falsa de una tecla sin uso antes de soltar Win, como hacen AutoHotkey y PowerToys)
- [x] Documentarlo en `native/PROTOCOL.md`; `scripts/copy-native.mjs` y `check-binaries.mjs` copian y comprueban `rl-hotkey.exe`
- [x] Si stdin se cierra, termina (no queda vivo si la app muere)

### Paso 3 — Main

- [x] `src/main/application/ports/hotkeySource.ts` y adaptador `src/main/infrastructure/hotkey/hotkeySidecar.ts` (arranca `rl-hotkey.exe`, reinicia si cae, se cierra en `will-quit`)
- [x] `src/main/application/recordHotkey.ts`: une gestos con `MicRecording` (fuente de ajustes, nombre de la entrada como el del dock) y con el dock (sale mientras graba por el atajo)
- [x] Ajustes: `recordShortcut` (por defecto `Ctrl+Super`, `null` = desactivado) en el esquema de settings (sin migración: la mezcla con los valores por defecto lo rellena); al cambiarlo se manda `watch` de nuevo
- [x] El nombre de la grabación viene del renderer como en el dock: pedirlo por IPC al empezar o generarlo en main con la plantilla traducida (decidir al implementar y anotarlo)
- [x] `tests/main/recordHotkey.test.ts`: mantener graba y soltar guarda; manos libres no se para al soltar; en manos libres, volver a pulsar el atajo la para

### Paso 4 — Configuración

- [x] Sección en Configuración: campo que captura la combinación al pulsarla (muestra "Ctrl + Win"), botón para volver al valor por defecto y opción para desactivarlo
- [x] Aviso si la combinación no es válida o el sidecar no pudo registrarla
- [x] Textos en es, en y pt-BR (incluida la explicación de mantener y doble pulsación)

### Paso 5 — Verificación

- [x] Prueba real: con otra app enfocada, mantener Ctrl+Win graba y soltar guarda el MP3 y la entrada; un toque corto no graba
- [x] Prueba real: mantener Ctrl+Win graba y soltar para; Ctrl+Win, Win graba en manos libres y soltar no la para (confirmado por el usuario)
- [x] Prueba real: en manos libres, pulsar y soltar Ctrl+Win la para y guarda; Ctrl+Win+→ no la para
- [x] Prueba real: Ctrl+Win+→ sigue cambiando de escritorio y no graba; soltar Win no abre el menú Inicio
- [x] Prueba real: cambiar el atajo en Configuración funciona al momento; desactivarlo lo deja sin efecto; al salir no queda `rl-hotkey.exe` vivo
- [x] Código organizado: una responsabilidad por archivo, lógica pura separada de la integración, sin duplicación ni código muerto
- [x] Tests (`npm run test`), `npm run typecheck` y `npm run lint` pasan; `npm run dev` arranca
- [x] Commit: `feat(hotkey): atajo global para grabar (tarea 31)`

## Criterios de aceptación

- [x] Mantener el atajo graba mientras está pulsado y al soltarlo se guarda como una grabación normal (MP3 + entrada con transcripción)
- [x] La doble pulsación deja grabando en manos libres hasta pararla desde el dock, la app o volviendo a pulsar el atajo
- [x] El atajo funciona con la app en segundo plano y no rompe los atajos de Windows ni abre el menú Inicio
- [x] Se cambia y se desactiva en Configuración, y el cambio se aplica sin reiniciar

## Bitácora

<!-- Resumida: 1–3 entradas de una línea. Solo decisiones no obvias, problemas y desviaciones. -->

- 2026-10-01 — D10 resuelta por el usuario: Ctrl+Win, configurable en Configuración; mantener = grabar mientras se pulsa, doble pulsación (Ctrl+Win, Win) = manos libres; grabando, el atajo no hace nada.
- 2026-10-01 — Nombre de la grabación: el dock manda al main las plantillas traducidas con `{date}` (al abrir y al cambiar de idioma) y el main pone la fecha; sin ida y vuelta al empezar a grabar.
- 2026-10-01 — Pruebas reales con teclado y `npm run dev` confirmadas por el usuario; el sidecar también se probó a mano (`watch`/`off`, sale al cerrar stdin).
- 2026-10-01 — Cambio pedido por el usuario tras probarlo: en manos libres, pulsar y soltar Ctrl+Win la para (al soltar, para que Ctrl+Win+→ no la corte). También para la grabación empezada desde el dock.

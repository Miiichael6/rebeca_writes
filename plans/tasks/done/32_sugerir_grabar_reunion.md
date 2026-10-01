# 32 · Sugerir grabar una reunión

**Estado:** ✅ Terminada
**Fase:** 9 — Pulido · **Depende de:** 30 · **Doc:** petición del usuario (2026-10-01)

## Objetivo

Cuando empieza una llamada en Teams, Zoom, Meet u otra app de llamadas, el dock sale y **pregunta** si se quiere grabar el audio de la reunión. Es solo una sugerencia: nunca graba sin que el usuario pulse ✓.

## Enfoque

Que Teams o Zoom estén abiertos no significa que haya una llamada (suelen quedar en segundo plano todo el día). La señal fiable en Windows es **qué app está usando el micrófono ahora**: el registro `HKCU\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone` guarda por app (empaquetadas por nombre de paquete, de escritorio bajo `NonPackaged` con la ruta del .exe) `LastUsedTimeStart` / `LastUsedTimeStop`; `Stop = 0` significa que la está usando. Es lo mismo que pinta el icono de micrófono de la barra de tareas.

Se añade un tercer binario al crate de `native/` (`rl-calls.exe`) que vigila esa clave con `RegNotifyChangeKeyValue` (sin sondeo) e informa al main de qué apps tienen el micrófono abierto. Si una de ellas es una app de llamadas conocida, el main decide (lógica pura) si toca preguntar.

**Comportamiento (D11, D12):**

| Situación                                                         | Dock                                                          |
| ----------------------------------------------------------------- | ------------------------------------------------------------- |
| Una app de llamadas empieza a usar el micrófono y no se graba     | Sale con la pregunta "¿Grabar la reunión?" · ✓ graba · ✕ no   |
| ✓                                                                 | Graba con la fuente **Ambos** (sistema + micrófono), como el 🎤 |
| ✕, o nadie responde en `SUGGESTION_TIMEOUT_MS`                    | Se esconde y no vuelve a preguntar en esa llamada             |
| Ya se está grabando (dock, atajo o app)                           | No pregunta                                                   |
| La llamada termina (la app suelta el micrófono) grabando          | Nada: se para a mano, como siempre                            |

## Pasos

### Paso 1 — Qué es una llamada (lógica pura)

- [x] `src/main/domain/meeting/callApps.ts`: lista de apps de llamadas reconocidas (Teams clásico y nuevo `MSTeams`, `Zoom.exe`, Webex, Slack, Discord, Skype, sin navegadores, D11) y `callAppName(id)` que reconoce tanto el nombre de paquete como la ruta `NonPackaged` (`C:#...#Zoom.exe`)
- [x] `src/main/domain/meeting/meetingSuggestion.ts`: máquina de estados que recibe "apps con el micrófono" y "¿se está grabando?" y devuelve `suggest`, `withdraw` o nada; recuerda la llamada descartada hasta que la app suelta el micrófono (`SUGGESTION_TIMEOUT_MS` con nombre)
- [x] `tests/main/callApps.test.ts` y `tests/main/meetingSuggestion.test.ts`: empieza una llamada → sugiere; ✕ → no repite en la misma llamada pero sí en la siguiente; grabando → no sugiere; app que no es de llamadas (p. ej. grabadora de voz) → nada; nuestra propia grabación no cuenta como llamada

### Paso 2 — Sidecar que vigila el micrófono (Rust)

- [x] `native/src/bin/rl-calls/` (`main.rs`, `registry.rs` que lee la clave, `watch.rs` con `RegNotifyChangeKeyValue` sobre `microphone` y sus subclaves, `event.rs`): al arrancar y en cada cambio emite por stderr un JSON `{"type":"mic_users","apps":[...]}` con las apps que tienen `LastUsedTimeStop = 0`
- [x] Si stdin se cierra, termina (como `rl-capture` y `rl-hotkey`)
- [x] Documentarlo en `native/PROTOCOL.md`; `scripts/copy-native.mjs` y `check-binaries.mjs` copian y comprueban `rl-calls.exe`

### Paso 3 — Main

- [x] `src/main/application/ports/micUsageSource.ts` y adaptador `src/main/infrastructure/meeting/micUsageSidecar.ts` (arranca `rl-calls.exe`, reinicia si cae, se cierra en `will-quit`)
- [x] `src/main/application/meetingSuggester.ts`: une `micUsageSource`, `meetingSuggestion` y `MicRecording`, y pide al dock que pregunte o retire la pregunta
- [x] Dock: nueva pregunta `'meeting'` en `DockQuestion` (`src/shared/dock.ts`) y acciones `recordMeeting` / `dismissMeeting` en `src/main/domain/dock/dockAction.ts`; ✓ graba con la fuente de D12 y el nombre de grabación de reunión
- [x] Ajuste `suggestMeetingRecording` (por defecto `true`) en el esquema de settings; al apagarlo, el sidecar se para
- [x] `tests/main/dock.test.ts` (o el que ya cubre el dock): la pregunta `meeting` sale, ✓ graba, ✕ esconde sin grabar

### Paso 4 — Renderer

- [x] `DockApp.tsx` / `dockButtons.ts`: texto de la pregunta "¿Grabar la reunión?" y botones ✓ / ✕ con la animación de las otras preguntas
- [x] Nombre "Reunión {date}" (`meetingRecordingName` en `lib/recordingName.ts`): el renderer lo pasa al pulsar ✓
- [x] Configuración: interruptor "Sugerir grabar las reuniones"
- [x] Textos en es, en y pt-BR

### Paso 5 — Verificación

- [x] Prueba real: entrar a una llamada de Teams (o de prueba en Zoom) → el dock sale y pregunta; ✓ graba Ambos y al parar se guarda MP3 + entrada
- [x] Prueba real: ✕ no vuelve a preguntar en esa llamada; al colgar y entrar a otra, vuelve a preguntar
- [x] Prueba real: Teams abierto sin llamada no pregunta; grabar con el 🎤 o el atajo y luego entrar a una llamada no pregunta
- [x] Prueba real: con el interruptor apagado no pregunta; al salir no queda `rl-calls.exe` vivo
- [x] Código organizado: una responsabilidad por archivo, lógica pura separada de la integración, sin duplicación ni código muerto
- [x] Tests (`npm run test`), `npm run typecheck` y `npm run lint` pasan
- [x] `npm run dev` arranca
- [x] Commit: `feat(dock): sugerir grabar las reuniones (tarea 32)`

## Criterios de aceptación

- [x] Al empezar una llamada en una app de llamadas, el dock sale y pregunta si grabar; nunca graba sin ✓
- [x] Tener la app de llamadas abierta sin llamada no dispara la pregunta, y descartarla no la repite en la misma llamada
- [x] No pregunta si ya se está grabando, y se puede desactivar en Configuración
- [x] La detección no sondea ni gasta CPU en reposo, y no deja procesos vivos al salir

## Bitácora

<!-- Resumida: 1–3 entradas de una línea. Solo decisiones no obvias, problemas y desviaciones. -->

- 2026-10-01 — D11 y D12 resueltas por el usuario: reunión = app de llamadas conocida usando el micrófono (sin navegadores, para no dar falsos positivos); ✓ graba Ambos; con ✕ o sin respuesta no se repite en esa llamada; interruptor en Configuración.
- 2026-10-01 — Detección con `RegNotifyChangeKeyValue` en `rl-calls` (sin sondeo); de Listen (tarea 49) solo se tomó la lógica pura: la primera lectura es la base y la llamada acaba tras 6 s sin micro. El reinicio de sidecars se extrajo a `RestartingSidecar` (compartido con `rl-hotkey`); `check-binaries` no comprobaba `rl-hotkey` y ahora sí.
- 2026-10-01 — Integración real sin UI (`rl-calls.exe` + `MeetingSuggester` + un `Zoom.exe` falso grabando del micro): sugiere una vez y no queda `rl-calls` vivo. Las pruebas con el dock en pantalla las hizo el usuario; la pregunta se cortaba y cada pregunta pasó a tener su propio ancho (`dockWidth`).

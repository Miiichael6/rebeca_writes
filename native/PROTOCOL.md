# Protocolo de `rl-capture`

Main lanza `resources/bin/rl-capture.exe` y habla con él por tres tuberías:

| Tubería | Dirección      | Contenido                                |
| ------- | -------------- | ---------------------------------------- |
| stdin   | main → sidecar | Comandos JSON, uno por línea             |
| stderr  | sidecar → main | Respuestas y eventos JSON, uno por línea |
| stdout  | sidecar → main | Solo PCM binario. Nunca texto            |

Si stdin se cierra, el sidecar termina.

## Comandos (stdin)

Objeto JSON con el campo `cmd`. Los campos extra se ignoran.

| `cmd`  | Estado       | Respuesta                                                                                  |
| ------ | ------------ | ------------------------------------------------------------------------------------------ |
| `list` | Implementado | Un evento `devices` (precedido de un `warning` por cada endpoint que no se pudo describir) |
| `open` | Implementado | `opened` o `stream_error` con `reason: "open_failed"`                                      |
| `stop` | Implementado | `stopped` (también si el stream no existía)                                                |

```json
{"cmd":"list"}
{"cmd":"open","streamId":1,"deviceId":"wasapi:{0.0.0.00000000}.{...}","kind":"render"}
{"cmd":"stop","streamId":1}
```

- `streamId` (1–255) lo elige main; un `open` con un id ya abierto reemplaza el stream anterior.
- `kind: "render"` abre el endpoint en loopback (lo que suena); `capture`, el micrófono. El stream arranca capturando al abrirse con el formato de mezcla por defecto.
- En loopback WASAPI no entrega nada mientras hay silencio: main rellena ceros por reloj (ver `src/main/audio/silence.ts`).

## Eventos (stderr)

Objeto JSON con el campo `type`.

### `devices`

Endpoints **activos** en este momento (WASAPI `DEVICE_STATE_ACTIVE`); los desconectados o deshabilitados no aparecen. Salidas primero, luego entradas. Cada elemento sigue `AudioDevice` de `src/shared/types.ts`:

```json
{
  "type": "devices",
  "devices": [
    {
      "id": "wasapi:{0.0.0.00000000}.{db09e9e0-...}",
      "name": "Altavoces",
      "groupName": "Realtek(R) Audio",
      "kind": "render",
      "isDefault": true,
      "channels": 2,
      "sampleRate": 48000
    }
  ]
}
```

- `id`: id estable del endpoint (`DeviceId` de cpal).
- `name` / `groupName`: el nombre de Windows `"Altavoces (Realtek(R) Audio)"` partido por el último grupo de paréntesis. Sin grupo, ambos son el nombre completo.
- `kind`: `render` (se captura en loopback) o `capture` (micrófono, línea).
- `channels` / `sampleRate`: formato de mezcla por defecto del endpoint.

### `opened` / `stopped`

```json
{"type":"opened","streamId":1,"sampleRate":48000,"channels":2}
{"type":"stopped","streamId":1}
```

### `stream_error`

El stream ya no existe cuando llega este evento.

```json
{ "type": "stream_error", "streamId": 1, "reason": "device_lost", "message": "..." }
```

| `reason`        | Cuándo                                                             |
| --------------- | ------------------------------------------------------------------ |
| `open_failed`   | Id desconocido, sin formato por defecto o WASAPI rechazó el stream |
| `device_lost`   | El dispositivo se desconectó durante la captura                    |
| `stream_failed` | Cualquier otro error fatal del stream                              |

### `warning`

No fatal: endpoints que no se pudieron describir, y durante la captura xruns, cambios de formato del dispositivo o falta de prioridad de tiempo real.

```json
{ "type": "warning", "message": "skipped a Render endpoint: ..." }
```

### `error`

```json
{ "type": "error", "code": "bad_command", "message": "unknown variant `nope`, ..." }
```

| `code`               | Cuándo                                        |
| -------------------- | --------------------------------------------- |
| `bad_command`        | La línea no es JSON válido o `cmd` no existe  |
| `enumeration_failed` | El host de audio no pudo listar los endpoints |

## PCM (stdout)

Secuencia de bloques binarios, cada uno con cabecera little-endian de 7 bytes seguida de las muestras intercaladas:

```
[streamId u8][channels u16][frameCount u32][frameCount × channels × f32le]
```

`channels` va en cada bloque porque stdout y stderr son tuberías distintas: el primer bloque puede llegar antes que el `opened`. Los formatos enteros del dispositivo (i16, i32, u8) se convierten a f32 en el sidecar.

---

# Protocolo de `rl-hotkey`

Segundo binario del crate (tarea 31): vigila **una** combinación de teclas con un gancho de teclado de bajo nivel (`WH_KEYBOARD_LL`) y avisa a main cuando se pulsa y se suelta. Qué gesto es (mantener, doble pulsación) lo decide main (`src/main/domain/hotkey/gesture.ts`).

| Tubería | Dirección      | Contenido                    |
| ------- | -------------- | ---------------------------- |
| stdin   | main → sidecar | Comandos JSON, uno por línea |
| stderr  | sidecar → main | Eventos JSON, uno por línea  |
| stdout  | —              | Sin uso                      |

Si stdin se cierra, el sidecar termina. Arranca sin vigilar nada hasta el primer `watch`.

## Comandos (stdin)

| `cmd`   | Respuesta  | Qué hace                                         |
| ------- | ---------- | ------------------------------------------------ |
| `watch` | `watching` | Vigila esta combinación (reemplaza la anterior)  |
| `off`   | `off`      | Deja de vigilar: no llegan más eventos de teclas |

```json
{"cmd":"watch","modifiers":["ctrl","win"],"key":null}
{"cmd":"watch","modifiers":["ctrl","shift"],"key":82}
{"cmd":"off"}
```

- `modifiers`: `ctrl`, `alt`, `shift`, `win` (cualquier lado, izquierdo o derecho). Los que no están en la lista no pueden estar pulsados.
- `key`: código de tecla virtual (`VK_*`) de la tecla que no es modificador, o `null`.

## Eventos (stderr)

```json
{"type":"down"}
{"type":"up"}
{"type":"other"}
{"type":"error","code":"hook_failed","message":"..."}
```

| `type`             | Cuándo                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `down`             | La combinación queda completa (todas sus teclas pulsadas y ningún otro modificador)                |
| `up`               | Deja de estar completa                                                                             |
| `other`            | Se pulsa otra tecla con la combinación o parte de ella (Ctrl+Win+→): main lo descarta como atajo   |
| `watching` / `off` | Respuesta a `watch` / `off`                                                                        |
| `error`            | `bad_command` (línea no válida) o `hook_failed` (Windows rechazó el gancho; el sidecar sale con 1) |

## Efectos sobre el teclado

- El gancho nunca bloquea los atajos de Windows: Ctrl+Win+→ sigue cambiando de escritorio.
- Si la combinación lleva Win, al soltar Win tras completarla el sidecar descarta ese `keyup` y lo reenvía detrás de una pulsación de `VK 0xE8` (sin asignar), como la "mask key" de AutoHotkey: así Windows no abre el menú Inicio.
- Si la combinación lleva una tecla normal (`key`), esa tecla no llega a la app enfocada mientras los modificadores coinciden.
- Las pulsaciones inyectadas (`LLKHF_INJECTED`), incluidas las suyas, se ignoran.

# Protocolo de `rl-calls`

Tercer binario del crate (tarea 32): dice qué apps están usando el micrófono, leído del registro de privacidad de Windows (`HKCU\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone`, lo mismo que pinta el icono de micrófono de la barra de tareas). Qué apps son llamadas lo decide main (`src/main/domain/meeting/callApps.ts`).

| Tubería | Dirección      | Contenido                                       |
| ------- | -------------- | ----------------------------------------------- |
| stdin   | main → sidecar | Sin comandos: solo lo mantiene vivo (se ignora) |
| stderr  | sidecar → main | Eventos JSON, uno por línea                     |
| stdout  | —              | Sin uso                                         |

Si stdin se cierra, el sidecar termina. Para dejar de vigilar, main cierra stdin.

## Eventos (stderr)

```json
{"type":"mic_users","apps":["MSTeams_8wekyb3d8bbwe","C:#Users#USER#AppData#Roaming#Zoom#bin#Zoom.exe"]}
{"type":"error","code":"watch_failed","message":"..."}
```

| `type`      | Cuándo                                                                     |
| ----------- | -------------------------------------------------------------------------- |
| `mic_users` | Al arrancar y cada vez que cambia la lista (ordenada, sin repetidos)       |
| `error`     | `watch_failed`: no se pudo abrir o vigilar la clave; el sidecar sale con 1 |

- `apps`: el nombre de la clave de cada app con `LastUsedTimeStop = 0`: el nombre de familia del paquete en las empaquetadas y, en las de escritorio (bajo `NonPackaged`), la ruta del .exe con `#` en vez de `\`.
- Sin sondeo: `RegNotifyChangeKeyValue` sobre la clave y sus subclaves despierta el hilo solo cuando Windows escribe en ella. Muchas apps (juegos, dictado) escriben ahí; si la lista no cambia, no se emite nada.

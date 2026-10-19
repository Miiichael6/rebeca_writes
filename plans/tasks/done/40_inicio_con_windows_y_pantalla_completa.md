# 40 · Iniciar con Windows y esconder el dock a pantalla completa

**Estado:** ✅ Terminada (falta probarla a mano en el instalador)
**Fase:** 9 — Pulido · **Depende de:** 30 · **Doc:** petición del usuario (2026-10-19)

## Objetivo

Dos ajustes nuevos:

1. **Iniciar con Windows**: la app se abre sola al encender la PC, sin ventana, solo con el dock (la ventana se abre desde él).
2. **Esconder el dock a pantalla completa**: mientras un juego, un video o una presentación ocupa todo el monitor principal, el dock desaparece del todo (también la barra del borde, para no tocarla sin querer) y vuelve al salir. Encendido por defecto.

## Enfoque

- Iniciar con Windows: `app.setLoginItemSettings({ openAtLogin, args: ['--hidden'] })`. Con `--hidden` no se crea la ventana principal. Manda Windows: al arrancar, el ajuste se iguala a `executableWillLaunchAtLogin` (si se desactivó desde el Administrador de tareas, se apaga). Sin empaquetar no hace nada (registraría `electron.exe`). `--hidden` empieza por `-`, así que `pathsFromArgv` no lo toma por un archivo.
- Pantalla completa: quinto binario del crate de `native/`, `rl-fullscreen.exe`. Sondea cada 500 ms la ventana en primer plano y avisa cuando cubre todo el monitor principal (barra de tareas incluida; una ventana maximizada no cuenta). El sondeo es necesario porque pasar a pantalla completa (F11) no cambia la ventana en primer plano. Protocolo en `native/PROTOCOL.md`.

## Pasos

- [x] `native/src/bin/rl-fullscreen/` (`main.rs`, `foreground.rs`, `event.rs`) y feature `Win32_Graphics_Gdi`; tests de `covers` y del evento.
- [x] `scripts/copy-native.mjs` y `scripts/check-binaries.mjs` incluyen `rl-fullscreen.exe`.
- [x] Main: `domain/dock/fullscreenProtocol.ts`, puerto `FullscreenSource`, adaptador `infrastructure/fullscreen/fullscreenSidecar.ts`, caso de uso `application/dockFullscreen.ts`.
- [x] `Dock.setFullscreen()` y `DockSurface.setHidden()` (la ventana del dock se esconde y vuelve encima de todo).
- [x] Ajustes `hideDockInFullscreen` (true) y `openAtLogin` (false) con sus validadores.
- [x] `infrastructure/electron/loginItem.ts` y arranque sin ventana con `--hidden` en `index.ts`.
- [x] Configuración → Interfaz: interruptores "Iniciar con Windows" (`StartupSettings`) y "Esconder el dock a pantalla completa" (en `DockSettings`), textos en es, en y pt-BR.
- [x] Tests: `dockFullscreen.test.ts`, `fullscreenProtocol.test.ts` y un caso nuevo en `dock.test.ts`.
- [ ] Probar a mano: un video de YouTube con F11, un juego a pantalla completa, una ventana maximizada (el dock no se esconde).
- [ ] Probar a mano en el instalador: activar "Iniciar con Windows", reiniciar sesión y ver que arranca solo el dock.
- [x] Tests / typecheck / lint pasan
- [x] Commit

## Bitácora

- 2026-10-19 — Se esconde también con una pregunta del dock en pantalla (¿grabar la reunión?) o grabando: el usuario pidió que no estorbe en juegos y videos. Al salir de la pantalla completa la pregunta sigue ahí si nadie la respondió.
- 2026-10-19 — Solo cuenta el monitor principal, que es donde vive el dock: un video a pantalla completa en el segundo monitor no lo esconde.

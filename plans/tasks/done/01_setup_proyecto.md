# 01 · Setup del proyecto

**Estado:** ✅ Terminada
**Fase:** 1 — Base · **Depende de:** — · **Doc:** §1, §7 · **Bloqueada por:** D3 (resuelta: se reutiliza el scaffold)

## Objetivo
Dejar el repositorio, las dependencias, la estructura de carpetas y la seguridad de Electron listos para el resto de tareas.

## Pasos

### Paso 1 — Control de versiones
- [x] `git init` en la raíz del proyecto
- [x] Revisar `.gitignore`: `node_modules`, `out`, `dist`, `resources/bin/**` (binarios pesados), `*.log`
- [x] Commit inicial con el scaffold actual

### Paso 2 — Identidad de la app
- [x] Crear `src/shared/app.ts` con `export const APP_NAME = 'Transcriba'` (única fuente del nombre)
- [x] `package.json`: `name` (`transcriba`), `productName`, `description`, `author`
- [x] `electron-builder.yml`: `appId` (`com.transcriba.app`), `productName`
- [x] Título de ventana y `index.html` usan `APP_NAME`

### Paso 3 — Dependencias
- [x] Runtime: `zustand`, `i18next`, `react-i18next`, `electron-log`, `@tanstack/react-virtual`
- [x] Dev: `vitest`
- [x] Script `"test": "vitest run"` y `"test:watch": "vitest"`
- [x] Quitar `electron-updater` si no se usará (o dejarlo desactivado)

### Paso 4 — Estructura de carpetas (§7)
- [x] `src/main/engine/`, `src/main/services/`
- [x] `src/shared/` (tipos, canales IPC, constantes)
- [x] `src/renderer/src/store/`, `src/renderer/src/i18n/`
- [x] `scripts/`, `tests/`, `resources/bin/`
- [x] Alias `@shared` en `electron.vite.config.ts` y en los `tsconfig`

### Paso 5 — Seguridad de Electron
- [x] `webPreferences`: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- [x] CSP estricta en `index.html`
- [x] Bloquear navegación externa (`will-navigate`) y `window.open` (`setWindowOpenHandler`)

### Paso 6 — IPC tipado
- [x] `src/shared/ipc.ts`: constantes de canales + tipos de payload
- [x] Preload expone `window.api` con funciones concretas (nunca `ipcRenderer` crudo)
- [x] `src/preload/index.d.ts` tipa `window.api`
- [x] Ejemplo funcional: `api.app.getVersion()`

### Paso 7 — Verificación
- [x] `npm run dev` abre la app
- [x] `npm run typecheck` sin errores
- [x] `npm run test` corre (aunque aún no haya tests)
- [x] Commit: `chore: setup base del proyecto`

## Criterios de aceptación
- [x] Cambiar `APP_NAME` cambia el nombre en toda la app
- [x] `window.require` y `process` no existen en el renderer
- [x] dev, typecheck y test pasan

## Bitácora
- 2026-09-27 — D3 resuelta: se reutiliza el scaffold de `src/`. El repo ya tenía git y commit inicial.
- 2026-09-27 — `APP_NAME` llega a `index.html` con un plugin de Vite (`%APP_NAME%` en `electron.vite.config.ts`), a la ventana (`title`) y a `app.setName`. `APP_ID` también vive en `src/shared/app.ts`. Excepción: `electron-builder.yml` y `package.json` no pueden importar TS; su `productName`/`appId` se mantienen a mano.
- 2026-09-27 — Se quitó `electron-updater`, `dev-app-update.yml` y el bloque `publish` del builder. También `@electron-toolkit/preload`: exponía `ipcRenderer` crudo en `window.electron`.
- 2026-09-27 — IPC: `IpcInvokeMap` en `@shared/ipc` tipa los canales; `src/main/ipc.ts` registra los handlers con `handle()` tipado; el preload solo usa `invoke()` tipado. El preload sale en CJS, así que funciona con `sandbox: true`.
- 2026-09-27 — `window.open`: se deniega siempre; solo las URL `https://` se abren en el navegador del sistema. `will-navigate`: solo se permite el origen del servidor dev.
- 2026-09-27 — Vitest usa su propio `vitest.config.ts` (aliases + `passWithNoTests`).
- 2026-09-27 — Verificado por CDP en `npm run dev`: `document.title = "Transcriba"`, `typeof require/process/window.electron === "undefined"`, `api.app.getVersion() → "1.0.0"`.
- 2026-09-27 — ⚠️ Si `npm run dev` falla con `Cannot read properties of undefined (reading 'isPackaged')`, la terminal tiene `ELECTRON_RUN_AS_NODE=1` (la terminal integrada de VS Code lo hereda). Solución: `Remove-Item Env:ELECTRON_RUN_AS_NODE` (PowerShell) o `unset ELECTRON_RUN_AS_NODE` antes de correrlo.
- 2026-09-27 — Cerrada.

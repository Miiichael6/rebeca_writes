# 01 · Setup del proyecto

**Estado:** ⬜ Pendiente
**Fase:** 1 — Base · **Depende de:** — · **Doc:** §1, §7 · **Bloqueada por:** D3

## Objetivo
Dejar el repositorio, las dependencias, la estructura de carpetas y la seguridad de Electron listos para el resto de tareas.

## Pasos

### Paso 1 — Control de versiones
- [ ] `git init` en la raíz del proyecto
- [ ] Revisar `.gitignore`: `node_modules`, `out`, `dist`, `resources/bin/**` (binarios pesados), `*.log`
- [ ] Commit inicial con el scaffold actual

### Paso 2 — Identidad de la app
- [ ] Crear `src/shared/app.ts` con `export const APP_NAME = 'Transcriba'` (única fuente del nombre)
- [ ] `package.json`: `name` (`transcriba`), `productName`, `description`, `author`
- [ ] `electron-builder.yml`: `appId` (`com.transcriba.app`), `productName`
- [ ] Título de ventana y `index.html` usan `APP_NAME`

### Paso 3 — Dependencias
- [ ] Runtime: `zustand`, `i18next`, `react-i18next`, `electron-log`, `@tanstack/react-virtual`
- [ ] Dev: `vitest`
- [ ] Script `"test": "vitest run"` y `"test:watch": "vitest"`
- [ ] Quitar `electron-updater` si no se usará (o dejarlo desactivado)

### Paso 4 — Estructura de carpetas (§7)
- [ ] `src/main/engine/`, `src/main/services/`
- [ ] `src/shared/` (tipos, canales IPC, constantes)
- [ ] `src/renderer/src/store/`, `src/renderer/src/i18n/`
- [ ] `scripts/`, `tests/`, `resources/bin/`
- [ ] Alias `@shared` en `electron.vite.config.ts` y en los `tsconfig`

### Paso 5 — Seguridad de Electron
- [ ] `webPreferences`: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- [ ] CSP estricta en `index.html`
- [ ] Bloquear navegación externa (`will-navigate`) y `window.open` (`setWindowOpenHandler`)

### Paso 6 — IPC tipado
- [ ] `src/shared/ipc.ts`: constantes de canales + tipos de payload
- [ ] Preload expone `window.api` con funciones concretas (nunca `ipcRenderer` crudo)
- [ ] `src/preload/index.d.ts` tipa `window.api`
- [ ] Ejemplo funcional: `api.app.getVersion()`

### Paso 7 — Verificación
- [ ] `npm run dev` abre la app
- [ ] `npm run typecheck` sin errores
- [ ] `npm run test` corre (aunque aún no haya tests)
- [ ] Commit: `chore: setup base del proyecto`

## Criterios de aceptación
- [ ] Cambiar `APP_NAME` cambia el nombre en toda la app
- [ ] `window.require` y `process` no existen en el renderer
- [ ] dev, typecheck y test pasan

## Bitácora
- _(fecha — nota)_

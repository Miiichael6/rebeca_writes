# 25 · Publicación de versiones y actualizaciones automáticas

**Estado:** 🔄 En progreso (código listo; faltan las pruebas manuales del paso 7)
**Fase:** 8 — Distribución · **Depende de:** 22 · **Doc:** §6 (instalador), §8 (empaquetado)

## Objetivo
Publicar cada versión en GitHub Releases con un solo comando. La app instalada detecta que hay una versión nueva y, con un clic del usuario, la descarga, la instala y se reinicia sola. Los modelos, el historial, los settings y CUDA no se tocan.

## Contexto
- `electron-updater` lee `latest.yml` del Release y descarga el `.exe` y su `.blockmap`, así que solo baja lo que cambió.
- El NSIS es `perMachine: false` (se instala en `%LOCALAPPDATA%\Programs`), así que al actualizar no pide permisos de administrador.
- `userData` (`%APPDATA%\RebeccaWrites`: modelos, historial, settings, `backends/cuda`) queda fuera de la carpeta del programa y sobrevive a la actualización.
- La `v1.0.0` ya instalada **no** trae el actualizador: la primera versión con él (`v1.1.0`) se instala a mano. A partir de ahí, un clic.
- Sin certificado de firma, SmartScreen muestra "Editor desconocido" en la primera instalación. Las actualizaciones funcionan igual, porque `electron-updater` solo verifica la firma si se configura `publisherName`.

## Pasos

### Paso 1 — Dependencia y configuración de publicación
- [x] `npm i electron-updater` (dependencia de producción; el paquete lo incluye)
- [x] `electron-builder.yml` → bloque `publish` con `provider: github` y `owner`/`repo` según **D5**. `releaseType: draft`: el Release se crea como borrador y se publica a mano en GitHub después de revisarlo
- [x] Comprobar que `npm run build:win` genera `dist/latest.yml` y `dist/RebeccaWrites-Setup-X.Y.Z.exe.blockmap` junto al `.exe`
- [x] `package.json` → script `"release": "npm run build && electron-builder --win --publish always"`. Requiere `GH_TOKEN` en el entorno (token *fine-grained* con permiso `Contents: write` sobre el repo de Releases). Nunca se escribe en archivos del repo
- [x] `.gitignore`: `dev-app-update.yml` si se usa para pruebas locales (Paso 7)

### Paso 2 — Tipos, canales y settings compartidos
- [x] `src/shared/types.ts` → `UpdateStatus`:
  - `{ state: 'idle' }`
  - `{ state: 'checking' }`
  - `{ state: 'upToDate', checkedAt: number }`
  - `{ state: 'available', version, releaseNotes?: string, sizeBytes }`
  - `{ state: 'downloading', version, received, total, bytesPerSec, etaSec }`
  - `{ state: 'ready', version }`
  - `{ state: 'error', code: UpdateErrorCode }`
- [x] `UpdateErrorCode` = `'offline' | 'checkFailed' | 'downloadFailed' | 'noDiskSpace'`
- [x] `src/shared/ipc.ts`:
  - invoke: `updates:get-status`, `updates:check`, `updates:download`, `updates:install`
  - evento: `updates:status`
  - `AppApi.updates = { getStatus, check, download, install, onStatus }`
- [x] `src/shared/settings.ts` + `src/main/services/settingsStore.ts` → `autoCheckUpdates: boolean` (defecto `true`) con su validador. No hace falta migración: la clave que falta toma el valor por defecto
- [x] `src/preload/index.ts` → implementar `window.api.updates`

### Paso 3 — Lógica pura (testeable sin Electron)
- [x] `src/main/services/updatePolicy.ts`:
  - `shouldAutoCheck({ packaged, autoCheck, lastCheckAt, now })`: solo en la app empaquetada, con `autoCheckUpdates` activo y como mucho una vez cada 6 h
  - `installBlocker({ transcribing, cudaJob })`: devuelve `'transcribing' | 'cudaDownload' | null`. No se reinicia en medio de una transcripción, de la cola o de la descarga/instalación de CUDA
  - `errorCode(err)`: `ENOTFOUND`/`ECONNREFUSED`/`net::ERR_INTERNET_DISCONNECTED` → `offline`; `ENOSPC` → `noDiskSpace`; si no, `checkFailed` o `downloadFailed` según la fase
- [x] `tests/main/updatePolicy.test.ts`: casos normal, borde (exactamente 6 h, sin `lastCheckAt`), dev (`packaged: false`) y cada bloqueo

### Paso 4 — Servicio en main
- [x] `src/main/services/updater.ts` con `autoUpdater` de `electron-updater`:
  - `autoDownload = false` (el usuario decide) y `autoInstallOnAppQuit = true`: si descargó y no reinició, se instala al cerrar
  - `logger = electron-log`, para que el log de la app registre la comprobación y la descarga
  - mapea los eventos `checking-for-update`, `update-available`, `update-not-available`, `download-progress`, `update-downloaded` y `error` → `UpdateStatus`, y lo emite con `updates:status` a todas las ventanas
- [x] `checkForUpdates()`: si no está empaquetada, devuelve `upToDate` sin llamar a la red (evita el error de `app-update.yml` inexistente en dev), salvo que exista `dev-app-update.yml` (Paso 7)
- [x] `downloadUpdate()`: comprueba el espacio libre con `freeDiskSpace` (de `modelDownload.ts`) contra el tamaño del Release más un margen de 100 MB
- [x] `installUpdate()`: si `installBlocker(...)` no es `null`, devuelve `{ ok: false, reason }`. Si no, `autoUpdater.quitAndInstall(true, true)`: silencioso y vuelve a abrir la app
- [x] Antes de `quitAndInstall`, cerrar limpio: guardar cola e historial igual que en `before-quit` (reutilizar lo que ya hace `src/main/index.ts`, no duplicarlo)
- [x] `src/main/index.ts`: tras crear la ventana, `setTimeout(10 s)` → `shouldAutoCheck` → `checkForUpdates()`. Guardar `lastUpdateCheckAt` en memoria; no hace falta persistirlo
- [x] `src/main/ipc.ts` → handlers de los 4 canales

### Paso 5 — UI
- [x] `src/renderer/src/store/updates.ts` (Zustand): `status`, `check`, `download`, `install` y `useUpdatesSync()` (suscripción a `onStatus`), llamado una vez en `App.tsx`
- [x] Aviso al pasar a `available` (una vez por versión y sesión): toast "Hay una versión nueva (X.Y.Z)" con la acción **Actualizar** → `download()`
- [x] Al pasar a `ready`: toast persistente "Actualización lista" con **Reiniciar** → `install()`. Si responde `transcribing` o `cudaDownload`, toast "Se instalará al terminar / al cerrar la app"
- [x] `src/renderer/src/components/settings/AboutSection.tsx`:
  - versión actual;
  - botón **Buscar actualizaciones** con el estado ("Buscando…", "Estás al día", "Nueva versión X.Y.Z" + Actualizar);
  - barra de descarga con `DownloadProgress` (la misma que usan modelos y CUDA);
  - **Reiniciar y actualizar** cuando está `ready`;
  - interruptor "Buscar actualizaciones al iniciar" (`autoCheckUpdates`)
- [x] Notas de la versión: si `releaseNotes` viene, mostrarlas como texto plano (sin HTML) en un `ConfirmDialog` o desplegable
- [x] Locales `es` / `en` / `pt-BR`:
  - `updates.*`: `check`, `checking`, `upToDate`, `available`, `download`, `downloading`, `ready`, `restart`, `deferred`, `autoCheck`, `notes`
  - `errors.*`: `offline`, `checkFailed`, `updateDownloadFailed`

### Paso 6 — Flujo de publicación documentado
- [x] `README.md` → sección "Publicar una versión":
  1. `npm version minor|patch` (sube `package.json` y crea el tag `vX.Y.Z`)
  2. `git push && git push --tags`
  3. `$env:GH_TOKEN = '…'; npm run release`
  4. En GitHub → Releases → revisar el borrador (exe, blockmap, `latest.yml`), escribir las notas y **Publish**
- [x] Anotar que un tag ya publicado no se mueve: si hay un fallo, se publica `X.Y.Z+1`
- [x] `scripts/clean-dist.mjs` (`npm run clean:dist`): `build:win` y `release` vacían `dist/` antes de compilar, salvo los `.wsb` de Sandbox

### Paso 7 — Verificación
- [x] Tests (`updatePolicy`), typecheck y lint pasan
- [x] `npm run dev`: no hay errores del actualizador en el log y "Buscar actualizaciones" responde sin romper
- [ ] **Prueba local sin publicar** (provider `generic`):
  1. build `1.1.0` instalado;
  2. build `1.1.1` en `dist/`, servido con `npx http-server dist -p 8080`;
  3. en la copia instalada, editar `resources/app-update.yml` → `provider: generic`, `url: http://localhost:8080`;
  4. abrir 1.1.0 → aparece el aviso → Actualizar → progreso → Reiniciar → abre 1.1.1 (Configuración › Acerca de muestra la versión nueva)
- [ ] En esa prueba, modelos, historial, settings y `backends/cuda` siguen intactos después de actualizar
- [ ] Con una transcripción en curso, "Reiniciar" no cierra la app y avisa. Al cerrar la app, la actualización se instala sola
- [ ] Sin red: "Buscar actualizaciones" muestra el error `offline` traducido, sin toasts repetidos
- [ ] **Prueba real:** `npm run release` de `v1.1.0` → publicar el borrador → luego `v1.1.1` → la `1.1.0` instalada se actualiza desde GitHub con un clic
- [ ] Commit: `feat(updates): publicación en GitHub Releases y actualización con un clic`

## Criterios de aceptación
- [ ] `npm run release` deja en GitHub un Release borrador con el `.exe`, el `.blockmap` y `latest.yml`, sin pasos manuales aparte de publicarlo
- [ ] Una app instalada con versión anterior avisa de la nueva y se actualiza con un clic en "Actualizar" y otro en "Reiniciar", sin UAC ni reinstalar a mano
- [ ] La actualización no borra ni toca modelos, historial, settings ni el paquete CUDA descargado
- [ ] Nunca se reinicia a mitad de una transcripción ni de la descarga de CUDA

## Bitácora
- 2026-09-28 — Creada a pedido del usuario, que quiere publicar versiones y que la app se actualice con un clic. Se elige `electron-updater` + GitHub Releases porque ya se usan electron-builder y NSIS y no requiere servidor propio. Bloqueada por **D5**: si el repo es privado, la app no puede leer los Releases sin un token, y meter un token en la app no es seguro. La `v1.0.0` (tag ya publicado) no trae el actualizador; la primera versión pública con él será la `v1.1.0`.
- 2026-09-28 — D5 resuelta: el repo `Miiichael6/rebeca_writes` ya es público, los Releases se leen sin token. Pasos 1–6 hechos. `npm run release` ejecuta también `check:bin` (los `prebuild:*` no se disparan con ese nombre). `build:win` genera `latest.yml` y el `.blockmap`. `installUpdate` devuelve además `notReady` si no hay nada descargado. Pendiente del paso 7: prueba local `generic`, con transcripción en curso, sin red y la prueba real con v1.1.0 → v1.1.1. Ojo: para probar hay que subir la versión (`package.json` sigue en 1.0.0).
- 2026-09-30 — `dist/` acumulaba un instalador por versión (1,1 GB con cinco); las publicadas ya están en Releases, así que `build:win` y `release` lo vacían primero. Se conserva `prueba-limpia.wsb`, que apunta a esa carpeta.

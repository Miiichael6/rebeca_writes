# 12 · Persistencia y logs

**Estado:** ✅ Terminada
**Fase:** 5 — Datos (se adelanta) · **Depende de:** 01 · **Doc:** §5

## Objetivo
Guardar settings, historial y cola en JSON sin riesgo de corrupción, y registrar logs rotativos.

## Pasos

### Paso 1 — Escritura atómica
- [x] `services/fsAtomic.ts`: `writeJsonAtomic(path, data)` → escribir `<path>.tmp` + `fsync` + `rename`
- [x] `readJsonSafe(path, fallback)`: si el JSON está corrupto, respaldarlo como `.corrupt-<fecha>` y devolver el fallback
- [x] Serializar escrituras al mismo archivo (cola de promesas) y aplicar debounce
- [x] Tests con carpeta temporal

### Paso 2 — Settings
- [x] `src/shared/settings.ts`: tipo `Settings` + `DEFAULT_SETTINGS` (backend, modelo, idioma, traducir, prompt, maxLen, suppressNst, normalize = true, threads = núcleos/2, showCaptions, videoHeight, tema, idioma de UI, límite de caché, opciones de cola, tamaño de ventana)
- [x] `services/settings.ts`: cargar, fusionar con los defaults, `version` para migraciones
- [x] IPC `settings:get`, `settings:set` (parcial) y evento `settings:changed`
- [x] Conectar `useSettingsStore` en el renderer

### Paso 3 — Historial
- [x] `history/index.json`: `{ id, filePath, fileName, durationSec, model, language, detectedLanguage, backend, createdAt, status }`
- [x] `history/<id>.json`: `{ segments: { start, end, text, edited? }[] }`
- [x] API: `list`, `get(id)`, `create`, `update`, `appendSegments`, `remove`, `clear`
- [x] Guardado incremental de segmentos durante la transcripción (con debounce)

### Paso 4 — Cola
- [x] `queue.json` (la lógica va en la tarea 17)

### Paso 5 — Logs
- [x] `electron-log` en `userData/logs/`, rotación ~5 MB × 3 archivos
- [x] Capturar `uncaughtException` y `unhandledRejection`
- [x] IPC `app:openLogs`

### Paso 6 — Verificación
- [x] Matar la app durante una escritura y comprobar que los JSON siguen válidos
- [x] Commit: `feat(data): persistencia atómica y logs`

## Criterios de aceptación
- [x] Los datos sobreviven a cierres bruscos
- [x] Los settings se aplican al reiniciar

## Bitácora
- 2026-09-27 — La tarea 05 creó un `services/settings.ts` mínimo (solo `detectedBackend` y `backend`, escritura temporal + rename). Reemplazarlo aquí manteniendo esas dos claves.
- 2026-09-28 — Hecho. Cada store es puro (`settingsStore`, `historyStore`, `queueStore`, `fsAtomic`, sin Electron, con tests en carpeta temporal) y tiene un puente con Electron aparte (`settings.ts`, `history.ts`). Se sigue el patrón `previewCache`/`previews`.
- 2026-09-28 — Settings: el main es la fuente de verdad. La validación va clave por clave, recorta los números a su rango y hace migraciones con `version`. Las claves `backend`/`detectedBackend` de la tarea 05 se conservan. El tema ahora va por `settings:set` y el main aplica `nativeTheme.themeSource`, así que se eliminó `theme:set-mode`. El tamaño y la posición de la ventana se guardan y se restauran solo si siguen dentro de una pantalla.
- 2026-09-28 — Historial: `TranscribeJob.historyId` (opcional) activa el guardado incremental en `transcribeManager`. El IPC del historial queda para la tarea 18, y la instancia de `QueueStore` con su ruta real queda para la tarea 17.
- 2026-09-28 — Logs en `userData/logs/main.log`, de 5 MB, con rotación a `main.1.log` y `main.2.log`. `errorHandler.startCatching` captura los errores no controlados.
- 2026-09-28 — Prueba de cortes: se mató con `taskkill /F` un proceso que escribía un JSON de 40 000 segmentos, 25 veces. Los 25 archivos quedaron válidos y completos. Si queda un `.tmp` suelto no pasa nada.
- 2026-09-28 — Nota: la terminal de VS Code tiene `ELECTRON_RUN_AS_NODE=1`. Con esa variable, `npm run dev` falla (`electron.app` undefined), así que hay que lanzarlo con `env -u ELECTRON_RUN_AS_NODE npm run dev`.
- 2026-09-28 — Verificado en dev: la app arranca, `settings.json` se migra a v1 y se escribe el log. Falta comprobar a mano que un cambio hecho en la UI siga ahí después de reiniciar. Los tests unitarios ya prueban que el store lo recupera en otra instancia.

# 12 · Persistencia y logs

**Estado:** ⬜ Pendiente
**Fase:** 5 — Datos (se adelanta) · **Depende de:** 01 · **Doc:** §5

## Objetivo
Guardar settings, historial y cola en JSON sin riesgo de corrupción, y registrar logs rotativos.

## Pasos

### Paso 1 — Escritura atómica
- [ ] `services/fsAtomic.ts`: `writeJsonAtomic(path, data)` → escribir `<path>.tmp` + `fsync` + `rename`
- [ ] `readJsonSafe(path, fallback)`: si el JSON está corrupto, respaldarlo como `.corrupt-<fecha>` y devolver el fallback
- [ ] Serializar escrituras al mismo archivo (cola de promesas) y aplicar debounce
- [ ] Tests con carpeta temporal

### Paso 2 — Settings
- [ ] `src/shared/settings.ts`: tipo `Settings` + `DEFAULT_SETTINGS` (backend, modelo, idioma, traducir, prompt, maxLen, suppressNst, normalize = true, threads = núcleos/2, showCaptions, videoHeight, tema, idioma de UI, límite de caché, opciones de cola, tamaño de ventana)
- [ ] `services/settings.ts`: cargar, fusionar con los defaults, `version` para migraciones
- [ ] IPC `settings:get`, `settings:set` (parcial) y evento `settings:changed`
- [ ] Conectar `useSettingsStore` en el renderer

### Paso 3 — Historial
- [ ] `history/index.json`: `{ id, filePath, fileName, durationSec, model, language, detectedLanguage, backend, createdAt, status }`
- [ ] `history/<id>.json`: `{ segments: { start, end, text, edited? }[] }`
- [ ] API: `list`, `get(id)`, `create`, `update`, `appendSegments`, `remove`, `clear`
- [ ] Guardado incremental de segmentos durante la transcripción (con debounce)

### Paso 4 — Cola
- [ ] `queue.json` (la lógica va en la tarea 17)

### Paso 5 — Logs
- [ ] `electron-log` en `userData/logs/`, rotación ~5 MB × 3 archivos
- [ ] Capturar `uncaughtException` y `unhandledRejection`
- [ ] IPC `app:openLogs`

### Paso 6 — Verificación
- [ ] Matar la app durante una escritura y comprobar que los JSON siguen válidos
- [ ] Commit: `feat(data): persistencia atómica y logs`

## Criterios de aceptación
- [ ] Los datos sobreviven a cierres bruscos
- [ ] Los settings se aplican al reiniciar

## Bitácora
- 2026-09-27 — La tarea 05 creó un `services/settings.ts` mínimo (solo `detectedBackend` y `backend`, escritura temporal + rename). Reemplazarlo aquí manteniendo esas dos claves.

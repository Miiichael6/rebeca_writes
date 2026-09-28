# 19 · Entrada de archivos (diálogo, drag & drop, "Abrir con")

**Estado:** ⬜ Pendiente
**Fase:** 5 — Cola e historial · **Depende de:** 17 · **Doc:** §3, §4.2, §6

## Objetivo
Todas las formas de meter archivos en la app terminan en la cola.

## Pasos

### Paso 1 — Diálogo Abrir archivo
- [ ] `dialog.showOpenDialog` con `multiSelections` y los filtros de `formats.ts` (Video, Audio, Todos los archivos)
- [ ] 1 archivo → se abre y se transcribe o encola; varios → todos a la cola
- [ ] Atajo `Ctrl+O`

### Paso 2 — Drag & drop
- [ ] Zona de soltado en toda la ventana con overlay visual
- [ ] Obtener rutas en el preload con `webUtils.getPathForFile(file)` (`File.path` ya no existe)
- [ ] Enviar rutas a main → `expandPaths(paths)`: recorrer carpetas recursivamente y filtrar por extensiones admitidas
- [ ] Recorrido asíncrono (no bloquear main con carpetas enormes) + resumen "Se agregaron 48 archivos, 2 ignorados"

### Paso 3 — "Todos los archivos"
- [ ] Extensiones desconocidas: intentar con ffprobe; si no hay audio, error claro en ese trabajo

### Paso 4 — Instancia única
- [ ] `app.requestSingleInstanceLock()`; si falla, `app.quit()`
- [ ] Evento `second-instance` → leer argv → rutas a la cola + enfocar la ventana
- [ ] Arranque en frío con argv (doble clic en "Abrir con") → rutas a la cola

### Paso 5 — Asociación "Abrir con"
- [ ] `fileAssociations` en `electron-builder.yml` para las extensiones principales (se valida en la tarea 22)

### Paso 6 — Verificación
- [ ] Arrastrar una carpeta con subcarpetas y archivos que no son medios
- [ ] Commit: `feat(input): diálogo múltiple, drag & drop y abrir con`
- [ ] **Cierre de Fase 5**

## Criterios de aceptación
- [ ] Una carpeta con 50 videos se encola completa
- [ ] Abrir un archivo con la app ya abierta lo añade a la misma ventana

## Bitácora
- _(fecha — nota)_

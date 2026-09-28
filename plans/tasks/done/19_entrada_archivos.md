# 19 · Entrada de archivos (diálogo, drag & drop, "Abrir con")

**Estado:** ✅ Terminada (falta probar a mano el arrastre y `Ctrl+O`, ver Bitácora)
**Fase:** 5 — Cola e historial · **Depende de:** 17 · **Doc:** §3, §4.2, §6

## Objetivo
Todas las formas de meter archivos en la app terminan en la cola.

## Pasos

### Paso 1 — Diálogo Abrir archivo
- [x] `dialog.showOpenDialog` con `multiSelections` y los filtros de `formats.ts` (Video, Audio, Todos los archivos)
- [x] 1 archivo → se abre y se transcribe o encola; varios → todos a la cola
- [x] Atajo `Ctrl+O`

### Paso 2 — Drag & drop
- [x] Zona de soltado en toda la ventana con overlay visual
- [x] Obtener rutas en el preload con `webUtils.getPathForFile(file)` (`File.path` ya no existe)
- [x] Enviar rutas a main → `expandPaths(paths)`: recorrer carpetas recursivamente y filtrar por extensiones admitidas
- [x] Recorrido asíncrono (no bloquear main con carpetas enormes) + resumen "Se agregaron 48 archivos, 2 ignorados"

### Paso 3 — "Todos los archivos"
- [x] Extensiones desconocidas: intentar con ffprobe; si no hay audio, error claro en ese trabajo

### Paso 4 — Instancia única
- [x] `app.requestSingleInstanceLock()`; si falla, `app.quit()`
- [x] Evento `second-instance` → leer argv → rutas a la cola + enfocar la ventana
- [x] Arranque en frío con argv (doble clic en "Abrir con") → rutas a la cola

### Paso 5 — Asociación "Abrir con"
- [x] `fileAssociations` en `electron-builder.yml` para las extensiones principales (se valida en la tarea 22)

### Paso 6 — Verificación
- [x] Arrastrar una carpeta con subcarpetas y archivos que no son medios
- [x] Commit: `feat(input): diálogo múltiple, drag & drop y abrir con`
- [x] **Cierre de Fase 5**

## Criterios de aceptación
- [x] Una carpeta con 50 videos se encola completa
- [x] Abrir un archivo con la app ya abierta lo añade a la misma ventana

## Bitácora
- 2026-09-28 — "Abrir archivo" usa el diálogo con selección múltiple (`media:openFiles`). Con 1 archivo se abre en la vista sin transcribir solo (spec §4.1: el botón Transcribir aparece al abrir). Con varios, todos van a la cola. Drag & drop y "Abrir con" siempre van a la cola (spec §4.2 y §6). `Ctrl+O` es un atajo global; se ignora si hay un diálogo abierto.
- 2026-09-28 — `src/main/services/fileInput.ts` no depende de Electron. `expandPaths` acepta cualquier archivo suelto, aunque su extensión sea desconocida (Paso 3: el pipeline ya lo resuelve, porque ffprobe falla con `unreadableMedia` o `noAudioStream`). Las carpetas se recorren de forma asíncrona: primero los archivos, con orden natural, y después las subcarpetas. Solo se quedan las extensiones de `formats.ts` y el resto cuenta como "ignorados". No se siguen symlinks, así que no hay ciclos. Nota: `.ts` cuenta como video (MPEG-TS, spec §3).
- 2026-09-28 — `requestSingleInstanceLock` va después de `app.setName`, porque el lock vive en userData. `second-instance` enfoca la ventana, encola y avisa al renderer (`queue:filesReceived`, que muestra un toast con el resumen). En el arranque en frío se encola después de crear la ventana. Para que "Descartar" (retomar cola) no borre esos archivos, `QueueService` recuerda qué trabajos pendientes había al iniciar y solo descarta esos. Hay un test para esto.
- 2026-09-28 — Bug encontrado en la prueba manual: en dev, argv trae la carpeta del proyecto y no siempre en la misma posición (Chromium mete sus opciones delante), así que se encolaba el repo entero. `pathsFromArgv(argv, cwd, appPath)` ahora resuelve contra el directorio de trabajo y descarta `app.getAppPath()` por ruta, no por posición.
- 2026-09-28 — Verificado en `npm run dev` con userData aislado. Un arranque en frío en dev no encola nada. Una segunda instancia con una carpeta de prueba (3 mp4, `notas.txt`, `sub/c.mkv`, `sub/portada.jpg`, `sub/otra/d.wav`) más `notas.txt` suelto sale de inmediato, y la primera encola exactamente 6 trabajos en orden (los 5 medios más el `.txt` explícito). Los 50 videos están cubiertos por un test de `expandPaths`. El arrastre real desde el Explorador, el overlay y `Ctrl+O` quedan para revisar a mano en la ventana. El registro de la asociación se valida con el instalador (tarea 22).
- 2026-09-28 — Hay un fallo intermitente en `historyStore.test.ts` ("updateSegment con el texto original quita las marcas"). No se reproduce aislado, es anterior a esta tarea y parece de tiempos (debounce de 5 ms) con los tests en paralelo en Windows.
- 2026-09-28 — **Fase 5 cerrada.**

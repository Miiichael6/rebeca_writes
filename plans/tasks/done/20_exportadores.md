# 20 · Exportadores

**Estado:** ✅ Terminada (falta probar a mano en VLC y Jellyfin/Plex)
**Fase:** 6 — Exportar y Configuración · **Depende de:** 08, 15 · **Doc:** §4.1 Barra inferior · **Capturas:** Screenshot_28

## Objetivo
Exportar en 5 formatos correctos y guardar el .srt junto al video para Jellyfin y Plex.

## Pasos

### Paso 1 — Funciones puras (TDD)
- [x] `src/shared/exporters.ts`
- [x] `toTxtTimestamps(segments)` → `[mm:ss] texto` (o `[h:mm:ss]` si pasa de 1 h)
- [x] `toTxt(segments, { joined })` → texto plano (respeta "Unir líneas")
- [x] `toSrt(segments)` → índice, `00:00:01,430 --> 00:00:04,000`, texto, línea en blanco
- [x] `toVtt(segments)` → `WEBVTT` + `00:00:01.430 --> ...`
- [x] `toLrc(segments)` → `[mm:ss.xx]texto` (minutos > 59 sin pasar a horas)
- [x] Helpers de formato de tiempo con redondeo correcto (1.9999 s → `00:00:02,000`)
- [x] Tests: horas > 1, segmento en 0, redondeos, texto multilínea, caracteres especiales

### Paso 2 — Menú Exportar
- [x] Opciones: como .txt con marcas de tiempo · como .txt · como .vtt · como .lrc · como .srt
- [x] Separador + **Guardar .srt junto al archivo**
- [x] `dialog.showSaveDialog` con el nombre sugerido y la extensión
- [x] Escritura en UTF-8 (sin BOM; con BOM opcional para .txt si hace falta para el Bloc de notas)
- [x] Atajo `Ctrl+E` abre el menú

### Paso 3 — .srt junto al archivo
- [x] Nombre `<archivo sin ext>.<código de idioma>.srt` (idioma detectado o elegido; `en` si se tradujo)
- [x] Si ya existe → confirmar reemplazo
- [x] Toast con "Mostrar en el Explorador"
- [x] Función reutilizada por la opción automática de la cola (tarea 17)

### Paso 4 — Verificación
- [ ] Abrir los .srt/.vtt en VLC y comprobar la sincronía (hecho con ffmpeg; falta VLC a mano)
- [x] Exportar una transcripción con segmentos editados (tarea 16) y comprobar que salen los textos editados
- [x] `npm run test` pasa
- [x] Commit: `feat(export): 5 formatos y srt junto al archivo`

## Criterios de aceptación
- [x] Los 5 formatos son válidos y están en UTF-8
- [ ] Jellyfin/Plex detectan el `.xx.srt` (el nombre sigue su convención; falta probarlo en un servidor)

## Bitácora
- 2026-09-28 — Formatos en `src/shared/exporters.ts` (`exportTranscript(format, segments, { joined })`), con tests de horas, redondeos (ms y centésimas), multilínea, `&`/`<` y vacíos. Los segmentos sin texto se saltan en todos los formatos. SRT/VTT conservan los saltos de línea del texto pero quitan las líneas en blanco (romperían el bloque); LRC y los .txt lo juntan en una línea. En VTT se escapan `&`, `<` y `>` (así nunca aparece `-->` en el texto).
- 2026-09-28 — Sin BOM: el Bloc de notas de Windows 10 1903+ detecta UTF-8 sin él, y el BOM molesta a algunos lectores de .srt. Se escribe con `writeTextAtomic` (nuevo en `fsAtomic.ts`, igual que el JSON: temporal + rename).
- 2026-09-28 — Main: `src/main/services/exporter.ts`. `export:save` abre "Guardar como" en la carpeta del original con `<nombre>.<ext>`; `export:saveSrtBeside` saca la ruta y el idioma del historial (no del renderer) y devuelve `exists` si ya hay uno, para que la barra inferior pida confirmación (`ConfirmDialog`). `export:showInFolder` solo acepta rutas exportadas en la sesión. La cola usa el mismo `writeSrtBeside` (con reemplazo, porque no puede preguntar).
- 2026-09-28 — Idioma del .srt: `srtLanguage()` → `en` si se tradujo, el elegido, o el detectado con `auto` (`und` si no hubo). `HistoryEntry` gana `translate`, que guarda `transcribeManager` al empezar.
- 2026-09-28 — Se exportan los segmentos del store del renderer, que ya llevan las ediciones de la tarea 16; el main los valida y se queda con `start`/`end`/`text`. El `.txt` sigue "Unir líneas". Los toasts aceptan ahora un botón (`toast(msg, ms, action)`).
- 2026-09-28 — Verificación: con segmentos de ejemplo (uno editado y multilínea, uno pasada la hora) se generaron los 5 archivos y ffmpeg lee .srt, .vtt y .lrc con los tiempos correctos. `npm run dev` arranca. Pendiente a mano: VLC y que Jellyfin/Plex reconozcan el `.xx.srt`.

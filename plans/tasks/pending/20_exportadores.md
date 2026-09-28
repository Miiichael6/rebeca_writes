# 20 · Exportadores

**Estado:** ⬜ Pendiente
**Fase:** 6 — Exportar y Configuración · **Depende de:** 08, 15 · **Doc:** §4.1 Barra inferior · **Capturas:** Screenshot_28

## Objetivo
Exportar en 5 formatos correctos y guardar el .srt junto al video para Jellyfin y Plex.

## Pasos

### Paso 1 — Funciones puras (TDD)
- [ ] `src/shared/exporters.ts`
- [ ] `toTxtTimestamps(segments)` → `[mm:ss] texto` (o `[h:mm:ss]` si pasa de 1 h)
- [ ] `toTxt(segments, { joined })` → texto plano (respeta "Unir líneas")
- [ ] `toSrt(segments)` → índice, `00:00:01,430 --> 00:00:04,000`, texto, línea en blanco
- [ ] `toVtt(segments)` → `WEBVTT` + `00:00:01.430 --> ...`
- [ ] `toLrc(segments)` → `[mm:ss.xx]texto` (minutos > 59 sin pasar a horas)
- [ ] Helpers de formato de tiempo con redondeo correcto (1.9999 s → `00:00:02,000`)
- [ ] Tests: horas > 1, segmento en 0, redondeos, texto multilínea, caracteres especiales

### Paso 2 — Menú Exportar
- [ ] Opciones: como .txt con marcas de tiempo · como .txt · como .vtt · como .lrc · como .srt
- [ ] Separador + **Guardar .srt junto al archivo**
- [ ] `dialog.showSaveDialog` con el nombre sugerido y la extensión
- [ ] Escritura en UTF-8 (sin BOM; con BOM opcional para .txt si hace falta para el Bloc de notas)
- [ ] Atajo `Ctrl+E` abre el menú

### Paso 3 — .srt junto al archivo
- [ ] Nombre `<archivo sin ext>.<código de idioma>.srt` (idioma detectado o elegido; `en` si se tradujo)
- [ ] Si ya existe → confirmar reemplazo
- [ ] Toast con "Mostrar en el Explorador"
- [ ] Función reutilizada por la opción automática de la cola (tarea 17)

### Paso 4 — Verificación
- [ ] Abrir los .srt/.vtt en VLC y comprobar la sincronía
- [ ] `npm run test` pasa
- [ ] Commit: `feat(export): 5 formatos y srt junto al archivo`

## Criterios de aceptación
- [ ] Los 5 formatos son válidos y están en UTF-8
- [ ] Jellyfin/Plex detectan el `.xx.srt`

## Bitácora
- _(fecha — nota)_

# Tareas — Transcriba

Documento fuente: [../about_this_project.md](../about_this_project.md) · Capturas: [../images/](../images/)

## Cómo se usa

- Cada archivo `NN_nombre.md` es una subtarea. Se hacen **en orden numérico** salvo que las dependencias digan otra cosa.
- Cada subtarea tiene un **Estado** general y una lista de **pasos** con casilla.
- Al marcar un paso: `- [ ]` → `- [x]`.
- Al cerrar cada **fase**, la app debe correr con `npm run dev` y se hace commit.
- En la sección **Bitácora** de cada archivo se anotan decisiones, problemas y fecha de cierre.

### Leyenda de estados

| Estado | Significado |
|---|---|
| ⬜ Pendiente | No iniciada |
| 🔄 En progreso | Se está trabajando |
| ✅ Terminada | Todos los pasos y criterios cumplidos |
| ⛔ Bloqueada | Espera una decisión o a otra tarea |

## Decisiones pendientes (bloquean tareas)

- [ ] **D1** ¿Hay captura de la ventana principal? Las 5 imágenes solo muestran Configuración y el menú Exportar. Si no, se diseña desde el texto §4.1. → afecta 03
- [ ] **D2** ¿Backend CUDA dentro del instalador (+~500 MB) o descargable desde la app? → afecta 05, 22
- [ ] **D3** ¿Se reutiliza el scaffold actual de `src/` o se rehace la fase 1? → afecta 01–04
- [ ] **D4** ¿`npm run build` debe generar el instalador (criterio §9) o se deja en `build:win`? → afecta 22

## Tablero

| # | Subtarea | Fase | Depende de | Estado |
|---|---|---|---|---|
| 01 | [Setup del proyecto](01_setup_proyecto.md) | 1 Base | — | ⬜ Pendiente |
| 02 | [Tema y ventana frameless](02_tema_y_ventana.md) | 1 Base | 01 | ⬜ Pendiente |
| 03 | [Layout principal](03_layout_principal.md) | 1 Base | 02 | ⬜ Pendiente |
| 04 | [Internacionalización](04_i18n.md) | 1 Base | 03 | ⬜ Pendiente |
| 05 | [Binarios y backend](05_binarios_y_backend.md) | 2 Motor | 01 | ⬜ Pendiente |
| 06 | [Descarga de modelos](06_descarga_modelos.md) | 2 Motor | 01 | ⬜ Pendiente |
| 07 | [Servicio ffmpeg](07_servicio_ffmpeg.md) | 2 Motor | 01 | ⬜ Pendiente |
| 08 | [TranscriptionEngine](08_transcription_engine.md) | 2 Motor | 05, 06, 07 | ⬜ Pendiente |
| 09 | [Protocolo media://](09_protocolo_media.md) | 3 Reproductor | 03 | ⬜ Pendiente |
| 10 | [Reproductor y sincronización](10_reproductor_sincronizacion.md) | 3 Reproductor | 09 | ⬜ Pendiente |
| 11 | [Vista previa de códecs](11_vista_previa_codecs.md) | 3 Reproductor | 07, 10 | ⬜ Pendiente |
| 12 | [Persistencia y logs](12_persistencia.md) | 5 Datos* | 01 | ⬜ Pendiente |
| 13 | [Streaming y virtualización](13_streaming_virtualizacion.md) | 4 En vivo | 08, 10 | ⬜ Pendiente |
| 14 | [Búsqueda](14_busqueda.md) | 4 En vivo | 13 | ⬜ Pendiente |
| 15 | [Unir líneas, autoscroll, copiar](15_unir_autoscroll_copiar.md) | 4 En vivo | 13 | ⬜ Pendiente |
| 16 | [Edición en línea](16_edicion_en_linea.md) | 4 En vivo | 12, 13 | ⬜ Pendiente |
| 17 | [Cola de trabajos](17_cola.md) | 5 Cola | 08, 12 | ⬜ Pendiente |
| 18 | [Historial](18_historial.md) | 5 Historial | 12 | ⬜ Pendiente |
| 19 | [Entrada de archivos](19_entrada_archivos.md) | 5 Cola | 17 | ⬜ Pendiente |
| 20 | [Exportadores](20_exportadores.md) | 6 Exportar | 08, 15 | ⬜ Pendiente |
| 21 | [Página de Configuración](21_configuracion.md) | 6 Config | 05, 06, 12 | ⬜ Pendiente |
| 22 | [Empaquetado](22_empaquetado.md) | 7 Build | todas | ⬜ Pendiente |
| 23 | [Calidad y aceptación](23_calidad_aceptacion.md) | 7 Cierre | 22 | ⬜ Pendiente |

\* La 12 (persistencia) se adelanta respecto a la fase 5 del documento porque la necesitan 16, 17, 18 y 21.

## Diagrama de dependencias

```
01 → 02 → 03 → 04
01 → 05 ┐
01 → 06 ├→ 08 ─┬→ 13 → 14, 15, 16
01 → 07 ┘      │
03 → 09 → 10 ──┘ → 11
01 → 12 → 16, 17, 18, 21
08 + 12 → 17 → 19
08 + 15 → 20
todas → 22 → 23
```

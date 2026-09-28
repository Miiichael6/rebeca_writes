# Tareas — Transcriba

Documento fuente: [../about_this_project.md](../about_this_project.md) · Capturas: [../images/](../images/)

## Cómo se usa

- Cada archivo `NN_nombre.md` es una subtarea. Se hacen **en orden numérico** salvo que las dependencias digan otra cosa.
- Cada subtarea tiene un **Estado** general y una lista de **pasos** con casilla.
- Al marcar un paso: `- [ ]` → `- [x]`.
- Al cerrar cada **fase**, la app debe correr con `npm run dev` y se hace commit.
- En la sección **Bitácora** de cada archivo se anotan decisiones, problemas y fecha de cierre.
- Cada archivo `NN_nombre.md` vive en la carpeta que corresponde a su estado, y al moverlo se actualiza su enlace y su estado en el **Tablero**:

  | Carpeta | Cuándo |
  |---|---|
  | [pending/](pending/) | Subtarea no iniciada (⬜) o bloqueada (⛔) |
  | [in_progress/](in_progress/) | Al **empezar** a trabajarla (🔄). Solo debería haber una a la vez |
  | [done/](done/) | Al **terminarla** (✅), con todos sus pasos y criterios cumplidos |

### Leyenda de estados

| Estado | Significado |
|---|---|
| ⬜ Pendiente | No iniciada |
| 🔄 En progreso | Se está trabajando |
| ✅ Terminada | Todos los pasos y criterios cumplidos |
| ⛔ Bloqueada | Espera una decisión o a otra tarea |

## Decisiones pendientes (bloquean tareas)

- [x] **D1** ¿Hay captura de la ventana principal? Las 5 imágenes solo muestran Configuración y el menú Exportar. Si no, se diseña desde el texto §4.1. → afecta 03 — **Sí**, `images/main_view.png` (2026-09-27)
- [ ] **D2** ¿Backend CUDA dentro del instalador (+~500 MB) o descargable desde la app? → afecta 05, 22
- [x] **D3** ¿Se reutiliza el scaffold actual de `src/` o se rehace la fase 1? → afecta 01–04 — **Se reutiliza** (2026-09-27)
- [ ] **D4** ¿`npm run build` debe generar el instalador (criterio §9) o se deja en `build:win`? → afecta 22

## Tablero

| # | Subtarea | Fase | Depende de | Estado |
|---|---|---|---|---|
| 01 | [Setup del proyecto](done/01_setup_proyecto.md) | 1 Base | — | ✅ Terminada |
| 02 | [Tema y ventana frameless](done/02_tema_y_ventana.md) | 1 Base | 01 | ✅ Terminada |
| 03 | [Layout principal](done/03_layout_principal.md) | 1 Base | 02 | ✅ Terminada |
| 04 | [Internacionalización](done/04_i18n.md) | 1 Base | 03 | ✅ Terminada |
| 05 | [Binarios y backend](done/05_binarios_y_backend.md) | 2 Motor | 01 | ✅ Terminada (paso 6.4 espera D2) |
| 06 | [Descarga de modelos](done/06_descarga_modelos.md) | 2 Motor | 01 | ✅ Terminada |
| 07 | [Servicio ffmpeg](done/07_servicio_ffmpeg.md) | 2 Motor | 01 | ✅ Terminada |
| 08 | [TranscriptionEngine](done/08_transcription_engine.md) | 2 Motor | 05, 06, 07 | ✅ Terminada |
| 09 | [Protocolo media://](done/09_protocolo_media.md) | 3 Reproductor | 03 | ✅ Terminada |
| 10 | [Reproductor y sincronización](done/10_reproductor_sincronizacion.md) | 3 Reproductor | 09 | ✅ Terminada |
| 11 | [Vista previa de códecs](done/11_vista_previa_codecs.md) | 3 Reproductor | 07, 10 | ✅ Terminada |
| 12 | [Persistencia y logs](done/12_persistencia.md) | 5 Datos* | 01 | ✅ Terminada |
| 13 | [Streaming y virtualización](done/13_streaming_virtualizacion.md) | 4 En vivo | 08, 10 | ✅ Terminada |
| 14 | [Búsqueda](pending/14_busqueda.md) | 4 En vivo | 13 | ⬜ Pendiente |
| 15 | [Unir líneas, autoscroll, copiar](pending/15_unir_autoscroll_copiar.md) | 4 En vivo | 13 | ⬜ Pendiente |
| 16 | [Edición en línea](pending/16_edicion_en_linea.md) | 4 En vivo | 12, 13 | ⬜ Pendiente |
| 17 | [Cola de trabajos](pending/17_cola.md) | 5 Cola | 08, 12 | ⬜ Pendiente |
| 18 | [Historial](pending/18_historial.md) | 5 Historial | 12 | ⬜ Pendiente |
| 19 | [Entrada de archivos](pending/19_entrada_archivos.md) | 5 Cola | 17 | ⬜ Pendiente |
| 20 | [Exportadores](pending/20_exportadores.md) | 6 Exportar | 08, 15 | ⬜ Pendiente |
| 21 | [Página de Configuración](pending/21_configuracion.md) | 6 Config | 05, 06, 12 | ⬜ Pendiente |
| 22 | [Empaquetado](pending/22_empaquetado.md) | 7 Build | todas | ⬜ Pendiente |
| 23 | [Calidad y aceptación](pending/23_calidad_aceptacion.md) | 7 Cierre | 22 | ⬜ Pendiente |

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

# Tareas — RebeccaWrites

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
- [x] **D2** ¿Backend CUDA dentro del instalador (+~500 MB) o descargable desde la app? → afecta 05, 22 — **Descargable** (2026-09-28)
- [x] **D3** ¿Se reutiliza el scaffold actual de `src/` o se rehace la fase 1? → afecta 01–04 — **Se reutiliza** (2026-09-27)
- [x] **D4** ¿`npm run build` debe generar el instalador (criterio §9) o se deja en `build:win`? → afecta 22 — **Se deja en `build:win`** (2026-09-28)
- [x] **D5** ¿El repo es público o los Releases van en otro repo? → afecta 25 — **Repo público** `Miiichael6/rebeca_writes` (2026-09-28)
- [x] **D6** Al parar una grabación de micrófono, ¿en qué formato y carpeta se guarda? (propuesta: MP3 en `Documentos\RebeccaWrites\Grabaciones`, cambiable en Configuración) → afecta 29 — **MP3**; carpeta la propuesta, cambiable en Configuración (2026-09-30)
- [x] **D7** ¿Se graba siempre del micrófono predeterminado de Windows o se añade un selector de entrada en Configuración? → afecta 29 — **Tres fuentes: Computadora, Mi voz y Ambos**, con los dispositivos predeterminados de Windows (2026-09-30)
- [x] **D8** ¿Qué hacen los botones del dock? → afecta 30 — **Sin grabar: onda quieta + 🎤 (graba). Grabando (borde azul): ■ · onda · 🎤; ■ pregunta "¿Terminar?": ✓ para y guarda, ✕ sigue grabando.** Menú contextual propio con "Grabar ▸" Sistema / Micrófono / Ambos (2026-10-01)
- [x] **D9** ¿Cómo se sale del todo de la app? → afecta 30 — **"Salir" en el menú del dock, con confirmación; no queda ningún proceso** (2026-10-01)
- [x] **D10** ¿Cómo funciona el atajo para grabar? → afecta 31 — **Ctrl+Win, configurable en Configuración. Mantener = graba mientras se pulsa y al soltar guarda; doble pulsación (Ctrl+Win, Win) = manos libres; en manos libres, volver a pulsar el atajo la para** (2026-10-01)
- [x] **D11** ¿Cuándo se considera que hay una reunión? → afecta 32 — **Cuando una app de llamadas conocida (Teams, Zoom, Webex, Slack, Discord, Skype) está usando el micrófono; sin navegadores** (2026-10-01)
- [x] **D12** Al pulsar ✓, ¿qué se graba y cuántas veces se pregunta? → afecta 32 — **Ambos (sistema + micrófono); con ✕ o sin respuesta no se repite hasta la siguiente llamada; interruptor en Configuración** (2026-10-01)

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
| 14 | [Búsqueda](done/14_busqueda.md) | 4 En vivo | 13 | ✅ Terminada |
| 15 | [Unir líneas, autoscroll, copiar](done/15_unir_autoscroll_copiar.md) | 4 En vivo | 13 | ✅ Terminada |
| 16 | [Edición en línea](done/16_edicion_en_linea.md) | 4 En vivo | 12, 13 | ✅ Terminada (exportar ediciones se comprueba en la 20) |
| 17 | [Cola de trabajos](done/17_cola.md) | 5 Cola | 08, 12 | ✅ Terminada (falta prueba manual con archivos reales) |
| 18 | [Historial](done/18_historial.md) | 5 Historial | 12 | ✅ Terminada (falta prueba manual en la app) |
| 19 | [Entrada de archivos](done/19_entrada_archivos.md) | 5 Cola | 17 | ✅ Terminada (falta probar a mano el arrastre y Ctrl+O) |
| 20 | [Exportadores](done/20_exportadores.md) | 6 Exportar | 08, 15 | ✅ Terminada (falta probar a mano en VLC y Jellyfin/Plex) |
| 21 | [Página de Configuración](done/21_configuracion.md) | 6 Config | 05, 06, 12 | ✅ Terminada |
| 22 | [Empaquetado](done/22_empaquetado.md) | 7 Build | todas | ✅ Terminada |
| 23 | [Calidad y aceptación](done/23_calidad_aceptacion.md) | 7 Cierre | 22 | ✅ Terminada |
| 23.1 | ↳ [Descarga del backend CUDA](done/23.1_descarga_cuda.md) | 7 Cierre | 23 | ✅ Terminada |
| 24 | [Prueba manual de aceptación y v1.0.0](in_progress/24_prueba_manual_aceptacion.md) | 7 Cierre | 23 | 🔄 En progreso |
| 25 | [Publicación y actualizaciones automáticas](in_progress/25_actualizaciones_automaticas.md) | 8 Distribución | 22 | 🔄 En progreso |
| 26 | [Animaciones y microinteracciones](in_progress/26_animaciones_microinteracciones.md) | 9 Pulido | 22 | 🔄 En progreso |
| 27 | [Transcripción en vivo desde Rebecca Listen](done/27_transcripcion_en_vivo_desde_rebecca_listen.md) | 9 Pulido | 17, 18, 19 | ✅ Terminada |
| 28 | [Hexagonal: lo que falta de main](done/28_hexagonal_main_restante.md) | 9 Pulido | — | ✅ Terminada |
| 29 | [Grabar con el micrófono](done/29_grabar_con_microfono.md) | 9 Pulido | 27, 28 | ✅ Terminada |
| 30 | [Dock en el borde de la pantalla](done/30_dock_en_el_borde.md) | 9 Pulido | 29 | ✅ Terminada |
| 31 | [Atajo de teclado para grabar](done/31_atajo_grabar.md) | 9 Pulido | 30 | ✅ Terminada |
| 32 | [Sugerir grabar una reunión](done/32_sugerir_grabar_reunion.md) | 9 Pulido | 30 | ✅ Terminada |

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
todas → 22 → 23 → 24
              23 → 23.1
        22 → 25 (actualizaciones; primera versión con ellas: v1.1.0)
        22 → 26 (animaciones y Select propio)
17 + 18 + 19 → 27 (vivo desde Listen) ┐
                               28 ─┴→ 29 (grabar con micrófono) → 30 (dock en el borde) → 31 (atajo para grabar)
                                                                        30 → 32 (sugerir grabar reuniones)
```

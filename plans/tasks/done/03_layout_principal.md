# 03 · Layout principal con datos de ejemplo

**Estado:** ✅ Terminada
**Fase:** 1 — Base · **Depende de:** 02 · **Doc:** §4.1, §4.2 · **Bloqueada por:** D1 (resuelta)

> ⚠ No hay captura de la ventana principal en `images/`. Si no se agrega, se diseña a partir del texto de §4.1.
(notas: agregué una plans\images\main_view.png)

## Objetivo
Maquetar toda la ventana principal sin lógica real, alimentada por stores Zustand con datos de ejemplo.

## Pasos

### Paso 1 — Stores con mocks
- [x] `store/ui.ts`: panel de video visible, altura, vista actual (principal / configuración), cola abierta
- [x] `store/history.ts`: entradas de ejemplo repartidas en varias fechas, id seleccionado, filtro
- [x] `store/transcript.ts`: segmentos de ejemplo `{ start, end, text }`, progreso, estado
- [x] `store/queue.ts`: trabajos de ejemplo en todos los estados
- [x] Tipos compartidos en `src/shared/types.ts`

### Paso 2 — Sidebar (~260 px)
- [x] Botón **Abrir archivo** (ícono carpeta)
- [x] Botón cuadrado **Borrar historial** (ícono goma)
- [x] Campo **Filtrar por...**
- [x] Historial agrupado: Hoy, Ayer, Esta semana, Este mes, Anteriores
- [x] Ítem: ícono de tipo (video/audio), nombre truncado, tooltip con nombre completo
- [x] Ítem seleccionado: barra roja izquierda + fondo gris
- [x] Ítem en proceso: indicador de progreso pequeño
- [x] Botón **Cola** abajo con contador de pendientes

### Paso 3 — Toolbar del área derecha
- [x] Combo **Modelo Whisper** (+ "Descargar más modelos...")
- [x] Combo **Idioma** ("Detectar automáticamente" + lista)
- [x] Checkbox **Traducir al inglés**
- [x] Botón ícono video (mostrar/ocultar panel)
- [x] Botón ícono engranaje (Configuración)
- [x] Botón **Transcribir** / **Cancelar** según estado

### Paso 4 — Player (placeholder)
- [x] Contenedor con altura desde `useUiStore` (300–600 px)
- [x] Barra de controles visual: play/pausa, seek, tiempos, volumen, velocidad
- [x] Variante "solo audio" con fondo neutro y nombre del archivo

### Paso 5 — TranscriptView
- [x] Encabezado: título, flechas ↑ ↓, cuadro **Buscar...** con lupa
- [x] Barra de progreso fina con % y tiempo restante
- [x] Lista de segmentos `[mm:ss]` en gris + texto; estilo de segmento activo
- [x] Estado vacío ("Abre un archivo para empezar")

### Paso 6 — BottomBar
- [x] **Copiar transcripción**
- [x] Checkbox **Unir líneas**
- [x] Checkbox **Desplaz. auto**
- [x] Botón **Exportar** (menú visual como Screenshot_28)

### Paso 7 — Vistas secundarias vacías
- [x] Página **Configuración** con botón volver (contenido en tarea 21)
- [x] Panel **Cola** lateral/modal (contenido en tarea 17)

### Paso 8 — Verificación
- [x] Revisar en claro y oscuro, ventana pequeña y maximizada
- [x] Commit: `feat(ui): layout principal con datos de ejemplo`

## Criterios de aceptación
- [x] Todos los elementos de §4.1 visibles
- [x] Sin scroll horizontal; la lista de transcripción y el historial hacen scroll independiente
- [x] Ocultar el panel de video da más espacio a la transcripción

## Bitácora
- 2026-09-27 — D1 resuelta con `images/main_view.png`. Tipos en `src/shared/types.ts`, más `shared/media.ts` (extensiones §3) y `shared/whisper.ts` (modelos e idiomas; nombres vía `Intl.DisplayNames`, `jw`→`jv`).
- 2026-09-27 — Stores: `ui` (vista, cola, video visible/altura 300–600, opciones de la toolbar y la barra inferior, sin persistir hasta la tarea 12), `history` (8 entradas mock en todos los grupos y estados, filtro por nombre), `transcript` (estado derivado de la entrada: done → segmentos + activo, transcribing → parcial + % + ETA, resto → listo), `queue` (un trabajo por estado). Mocks en `store/mocks.ts`.
- 2026-09-27 — Agrupado del historial (`lib/historyGroups.ts`, semana empieza en lunes) y formato de tiempos (`lib/time.ts`) con tests en `tests/renderer/`. Se agregó `@renderer` a `tsconfig.node.json` para los tests.
- 2026-09-27 — Nuevo componente base `ui/Menu` (Esc, flechas, clic fuera) para Exportar. Cola = `<dialog>` modal a la derecha; Configuración = vista que reemplaza la principal (Esc o flecha vuelve). "Descargar más modelos..." abre Configuración.
- 2026-09-27 — Ventana pequeña: la altura del video se limita a `min(altura, 38vh)` para no aplastar la transcripción; las etiquetas de la toolbar se ocultan bajo 880 px (container query) y el volumen bajo 640 px.
- 2026-09-27 — Quitados elementos exclusivos de la app de referencia (micrófono, insignias Pro, enlace externo en Cola).
- 2026-09-27 — Verificado con `npm run dev` + CDP (claro/oscuro, 960×600 y 1920×1040, cola, menú Exportar, Configuración, borrar historial → vacío). Nota: si VS Code exporta `ELECTRON_RUN_AS_NODE`, lanzar con `env -u ELECTRON_RUN_AS_NODE npm run dev`.
- 2026-09-27 — Pendiente para otras tareas: `<video>` real y `media://` (09), sincronía y altura arrastrable (10), búsqueda (14), unir líneas (15), exportar (19), persistencia de opciones (12), virtualización de la lista (13), botón "Componentes" de desarrollo se borra en la 21.

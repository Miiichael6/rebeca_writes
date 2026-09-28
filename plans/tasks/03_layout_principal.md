# 03 · Layout principal con datos de ejemplo

**Estado:** ⬜ Pendiente
**Fase:** 1 — Base · **Depende de:** 02 · **Doc:** §4.1, §4.2 · **Bloqueada por:** D1

> ⚠ No hay captura de la ventana principal en `images/`. Si no se agrega, se diseña a partir del texto de §4.1.

## Objetivo
Maquetar toda la ventana principal sin lógica real, alimentada por stores Zustand con datos de ejemplo.

## Pasos

### Paso 1 — Stores con mocks
- [ ] `store/ui.ts`: panel de video visible, altura, vista actual (principal / configuración), cola abierta
- [ ] `store/history.ts`: entradas de ejemplo repartidas en varias fechas, id seleccionado, filtro
- [ ] `store/transcript.ts`: segmentos de ejemplo `{ start, end, text }`, progreso, estado
- [ ] `store/queue.ts`: trabajos de ejemplo en todos los estados
- [ ] Tipos compartidos en `src/shared/types.ts`

### Paso 2 — Sidebar (~260 px)
- [ ] Botón **Abrir archivo** (ícono carpeta)
- [ ] Botón cuadrado **Borrar historial** (ícono goma)
- [ ] Campo **Filtrar por...**
- [ ] Historial agrupado: Hoy, Ayer, Esta semana, Este mes, Anteriores
- [ ] Ítem: ícono de tipo (video/audio), nombre truncado, tooltip con nombre completo
- [ ] Ítem seleccionado: barra roja izquierda + fondo gris
- [ ] Ítem en proceso: indicador de progreso pequeño
- [ ] Botón **Cola** abajo con contador de pendientes

### Paso 3 — Toolbar del área derecha
- [ ] Combo **Modelo Whisper** (+ "Descargar más modelos...")
- [ ] Combo **Idioma** ("Detectar automáticamente" + lista)
- [ ] Checkbox **Traducir al inglés**
- [ ] Botón ícono video (mostrar/ocultar panel)
- [ ] Botón ícono engranaje (Configuración)
- [ ] Botón **Transcribir** / **Cancelar** según estado

### Paso 4 — Player (placeholder)
- [ ] Contenedor con altura desde `useUiStore` (300–600 px)
- [ ] Barra de controles visual: play/pausa, seek, tiempos, volumen, velocidad
- [ ] Variante "solo audio" con fondo neutro y nombre del archivo

### Paso 5 — TranscriptView
- [ ] Encabezado: título, flechas ↑ ↓, cuadro **Buscar...** con lupa
- [ ] Barra de progreso fina con % y tiempo restante
- [ ] Lista de segmentos `[mm:ss]` en gris + texto; estilo de segmento activo
- [ ] Estado vacío ("Abre un archivo para empezar")

### Paso 6 — BottomBar
- [ ] **Copiar transcripción**
- [ ] Checkbox **Unir líneas**
- [ ] Checkbox **Desplaz. auto**
- [ ] Botón **Exportar** (menú visual como Screenshot_28)

### Paso 7 — Vistas secundarias vacías
- [ ] Página **Configuración** con botón volver (contenido en tarea 21)
- [ ] Panel **Cola** lateral/modal (contenido en tarea 17)

### Paso 8 — Verificación
- [ ] Revisar en claro y oscuro, ventana pequeña y maximizada
- [ ] Commit: `feat(ui): layout principal con datos de ejemplo`

## Criterios de aceptación
- [ ] Todos los elementos de §4.1 visibles
- [ ] Sin scroll horizontal; la lista de transcripción y el historial hacen scroll independiente
- [ ] Ocultar el panel de video da más espacio a la transcripción

## Bitácora
- _(fecha — nota)_

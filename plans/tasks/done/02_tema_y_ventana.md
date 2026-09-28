# 02 · Tema y ventana frameless

**Estado:** ✅ Terminada
**Fase:** 1 — Base · **Depende de:** 01 · **Doc:** §4 (intro), §4.1 barra de título · **Capturas:** Screenshot_25–27 (estilo de tarjetas y controles)

## Objetivo
Tener el estilo Windows 11 Fluent con modo claro y oscuro, la barra de título propia y los componentes base de la interfaz.

## Pasos

### Paso 1 — Tokens de diseño
- [x] `styles/tokens.css`: acento `#E8432D` (+ hover/pressed), radio 8 px, espaciados, sombras, tipografía `Segoe UI Variable`, `Segoe UI`
- [x] `styles/theme-light.css`: fondo gris muy claro con degradado verde agua arriba, tarjetas blancas, borde sutil
- [x] `styles/theme-dark.css`: equivalentes oscuros
- [x] Contraste AA verificado para texto primario, secundario y acento en ambos temas

### Paso 2 — Tema claro / oscuro / sistema
- [x] Atributo `data-theme` en `<html>`
- [x] Modo "sistema" sigue `nativeTheme.shouldUseDarkColors` (evento `updated` → IPC)
- [x] Estado en `useUiStore` (se persistirá en la tarea 12)

### Paso 3 — Ventana frameless
- [x] `BrowserWindow` con `titleBarStyle: 'hidden'` + `titleBarOverlay` (min, max, cerrar nativos)
- [x] Actualizar colores de `titleBarOverlay` al cambiar de tema (`setTitleBarOverlay`)
- [x] Componente `TitleBar`: logo propio + `APP_NAME` a la izquierda, zona `-webkit-app-region: drag`
- [x] Tamaño mínimo de ventana (p. ej. 960×600) y recordar tamaño/posición (tarea 12)

### Paso 4 — Logo propio
- [x] Diseñar ícono simple (SVG) sin parecido a la app de referencia
- [x] Exportar `resources/icon.png` y `build/icon.ico` (multi-resolución)

### Paso 5 — Componentes base
- [x] `Button` (primario, secundario, ícono, peligro)
- [x] `Toggle` con texto "Activado/Desactivado" (como en las capturas)
- [x] `Checkbox`, `Radio`, `Select`, `NumberInput` (con flechas), `Slider`, `TextArea`
- [x] `Card` / `SettingRow` (ícono + título + descripción + control a la derecha)
- [x] `Dialog` de confirmación y `Toast` no bloqueante
- [x] Todos con foco visible y `aria-label` en botones de solo ícono

### Paso 6 — Verificación
- [x] Página de prueba temporal con todos los componentes en ambos temas
- [x] Commit: `feat(ui): tema fluent y ventana frameless`

## Criterios de aceptación
- [x] Cambiar el tema de Windows cambia la app en caliente
- [x] Minimizar, maximizar y cerrar funcionan en ambos temas
- [x] Se puede arrastrar la ventana desde la barra de título

## Bitácora
- 2026-09-27 — **Acento vs. relleno:** `#E8432D` se usa para indicadores (toggle, checkbox, radio, slider, bordes), que piden ≥3:1. Blanco sobre `#E8432D` da 3,98:1 y no cumple AA para texto, así que los botones primarios usan `--accent-fill #D63A25` (≈4,6:1). El texto en color acento usa `--accent-text` (`#C0321E` en claro, `#FF7A66` en oscuro), ≥4,5:1 sobre las tarjetas. Texto primario y secundario: `#1B1B1B`/`#5C5C5C` en claro, `#F2F2F2`/`#C5C5C5` en oscuro, todos AA.
- 2026-09-27 — **Tema:** `nativeTheme` en main es la fuente de verdad (`theme:get-resolved`, `theme:set-mode`, evento `theme:changed`). El renderer arranca con `matchMedia` para no parpadear y luego se sincroniza (`useThemeSync`). `src/main/theme.ts` aplica `setBackgroundColor` + `setTitleBarOverlay` a todas las ventanas. Colores compartidos en `src/shared/theme.ts` (`WINDOW_COLORS`, `TITLE_BAR_HEIGHT = 40`).
- 2026-09-27 — **Verificación:** cambié `AppsUseLightTheme` en el registro (HKCU) y la app pasó de oscuro a claro y de vuelta a oscuro en caliente. `windowControlsOverlay.visible = true` y la `.titlebar` (drag) mide 964 px de 1100, con el resto para los botones nativos. Minimizar, maximizar, cerrar y arrastrar son del sistema (overlay nativo). No se pueden automatizar por CDP, así que falta que el usuario los confirme a mano.
- 2026-09-27 — **Logo e íconos:** logo original en `src/renderer/src/assets/logo.svg` (barras de onda + líneas de texto sobre un cuadrado redondeado rojo). `npm run icons` (`scripts/build-icons.mjs`) lo rasteriza con Electron offscreen y genera `resources/icon.png`, `build/icon.png` (512 px) y `build/icon.ico` (16–256 px, entradas PNG). `build/icon.icns` (macOS) no se tocó.
- 2026-09-27 — **Componentes:** están en `components/ui/` con estilos en `styles/components.css`. `ConfirmDialog` usa `<dialog>` nativo: fue necesario `margin: auto` porque el reset global lo descentraba, y enfocar Cancelar después de `showModal()`, porque este ignora `autoFocus`. El layout existente (Toolbar, BottomBar, Sidebar, TranscriptView) ya usa estos componentes.
- 2026-09-27 — **Pendientes:** `src/renderer/src/dev/UiDemo.tsx` y el botón "Componentes" de la barra de título son temporales y solo existen en dev (`import.meta.env.DEV`). Hay que borrarlos antes de la entrega (tarea 21). Recordar el tamaño y la posición de la ventana queda para la tarea 12. Revisar el contraste del badge de la cola (`--info`) en oscuro cuando tenga contenido real.

# 02 · Tema y ventana frameless

**Estado:** ⬜ Pendiente
**Fase:** 1 — Base · **Depende de:** 01 · **Doc:** §4 (intro), §4.1 barra de título · **Capturas:** Screenshot_25–27 (estilo de tarjetas y controles)

## Objetivo
Tener el estilo Windows 11 Fluent con modo claro y oscuro, la barra de título propia y los componentes base de la interfaz.

## Pasos

### Paso 1 — Tokens de diseño
- [ ] `styles/tokens.css`: acento `#E8432D` (+ hover/pressed), radio 8 px, espaciados, sombras, tipografía `Segoe UI Variable`, `Segoe UI`
- [ ] `styles/theme-light.css`: fondo gris muy claro con degradado verde agua arriba, tarjetas blancas, borde sutil
- [ ] `styles/theme-dark.css`: equivalentes oscuros
- [ ] Contraste AA verificado para texto primario, secundario y acento en ambos temas

### Paso 2 — Tema claro / oscuro / sistema
- [ ] Atributo `data-theme` en `<html>`
- [ ] Modo "sistema" sigue `nativeTheme.shouldUseDarkColors` (evento `updated` → IPC)
- [ ] Estado en `useUiStore` (se persistirá en la tarea 12)

### Paso 3 — Ventana frameless
- [ ] `BrowserWindow` con `titleBarStyle: 'hidden'` + `titleBarOverlay` (min, max, cerrar nativos)
- [ ] Actualizar colores de `titleBarOverlay` al cambiar de tema (`setTitleBarOverlay`)
- [ ] Componente `TitleBar`: logo propio + `APP_NAME` a la izquierda, zona `-webkit-app-region: drag`
- [ ] Tamaño mínimo de ventana (p. ej. 960×600) y recordar tamaño/posición (tarea 12)

### Paso 4 — Logo propio
- [ ] Diseñar ícono simple (SVG) sin parecido a la app de referencia
- [ ] Exportar `resources/icon.png` y `build/icon.ico` (multi-resolución)

### Paso 5 — Componentes base
- [ ] `Button` (primario, secundario, ícono, peligro)
- [ ] `Toggle` con texto "Activado/Desactivado" (como en las capturas)
- [ ] `Checkbox`, `Radio`, `Select`, `NumberInput` (con flechas), `Slider`, `TextArea`
- [ ] `Card` / `SettingRow` (ícono + título + descripción + control a la derecha)
- [ ] `Dialog` de confirmación y `Toast` no bloqueante
- [ ] Todos con foco visible y `aria-label` en botones de solo ícono

### Paso 6 — Verificación
- [ ] Página de prueba temporal con todos los componentes en ambos temas
- [ ] Commit: `feat(ui): tema fluent y ventana frameless`

## Criterios de aceptación
- [ ] Cambiar el tema de Windows cambia la app en caliente
- [ ] Minimizar, maximizar y cerrar funcionan en ambos temas
- [ ] Se puede arrastrar la ventana desde la barra de título

## Bitácora
- _(fecha — nota)_

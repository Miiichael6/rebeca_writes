# 21 · Página de Configuración

**Estado:** ⬜ Pendiente
**Fase:** 6 — Exportar y Configuración · **Depende de:** 05, 06, 12 · **Doc:** §4.3 · **Capturas:** Screenshot_24, 25, 26, 27

> Seguir la distribución y el estilo de las capturas, **sin**: etiquetas "Pro", aviso "Limitado a 3 minutos", "NowSmart Audio Recorder", "Estilo de subtítulos/CC" ni la marca WizWhisp.

## Objetivo
Todas las opciones de §4.3 funcionando y persistidas.

## Pasos

### Paso 1 — Estructura
- [ ] Página con scroll y secciones: Modelos, Interfaz, Almacenamiento, Acerca de
- [ ] Cada opción es un `SettingRow` (ícono, título, descripción, control)
- [ ] Botón volver a la vista principal

### Paso 2 — Modelos › Backend (Screenshot_25)
- [ ] Fila con el backend activo a la derecha ("CUDA")
- [ ] Radios: CUDA "El mejor rendimiento. Recomendado." · GPU "Buen rendimiento (NVIDIA, AMD, Intel)" · CPU "Funcional, pero lento"
- [ ] Etiqueta "Detectado" junto al autodetectado
- [ ] Deshabilitar las opciones no disponibles, con motivo

### Paso 3 — Modelos › Modelos Whisper (Screenshot_26)
- [ ] Lista: nombre, velocidad, precisión, uso de memoria
- [ ] Por modelo: Descargar (con barra, velocidad y cancelar) / Eliminar + tamaño en disco
- [ ] **Agregar modelo personalizado** (sin candado)
- [ ] Modelos personalizados listados con opción de quitar

### Paso 4 — Modelos › Opciones de transcripción (Screenshot_27)
- [ ] **Prompt inicial**: toggle + textarea + contador de tokens aprox. (~caracteres/4) + ayuda
- [ ] **Longitud máxima de segmento**: NumberInput, 0 = sin límite
- [ ] **Suprimir tokens sin voz**: toggle
- [ ] **Normalización de audio**: toggle, activado por defecto
- [ ] **Hilos de CPU**: NumberInput 1..núcleos, por defecto núcleos/2

### Paso 5 — Interfaz (Screenshot_27, 24)
- [ ] **Mostrar subtítulos/CC**: toggle
- [ ] **Altura del panel de video**: slider 300–600 con "Actual: N px"
- [ ] **Tema**: Claro / Oscuro / Sistema
- [ ] **Idioma de la interfaz**: Usar el idioma de Windows / Español / English / Português (Brasil)

### Paso 6 — Almacenamiento
- [ ] Carpeta de modelos + botón abrir (`shell.openPath`)
- [ ] Tamaño actual de la caché de vistas previas + límite configurable + **Vaciar**

### Paso 7 — Acerca de (Screenshot_24)
- [ ] Logo, `APP_NAME`, versión (`app.getVersion()`)
- [ ] **Ver registros** → abre la carpeta de logs
- [ ] **Reconocimientos de software de terceros** → modal con licencias: whisper.cpp (MIT), modelos Whisper de OpenAI (MIT), ffmpeg (LGPL/GPL según la build), Electron (MIT), React, Zustand, i18next, lucide… (generar la lista desde `package.json` con un script)

### Paso 8 — Verificación
- [ ] Cada opción cambia el comportamiento real (revisar los argumentos de whisper-cli en el log)
- [ ] Commit: `feat(settings): página de configuración completa`
- [ ] **Cierre de Fase 6**

## Criterios de aceptación
- [ ] Todas las opciones persisten tras reiniciar
- [ ] No queda ningún elemento de marca ni de pago de la app de referencia

## Bitácora
- _(fecha — nota)_

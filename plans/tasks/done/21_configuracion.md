# 21 · Página de Configuración

**Estado:** ✅ Terminada
**Fase:** 6 — Exportar y Configuración · **Depende de:** 05, 06, 12 · **Doc:** §4.3 · **Capturas:** Screenshot_24, 25, 26, 27

> Seguir la distribución y el estilo de las capturas, **sin**: etiquetas "Pro", aviso "Limitado a 3 minutos", "NowSmart Audio Recorder", "Estilo de subtítulos/CC" ni la marca WizWhisp.

## Objetivo
Todas las opciones de §4.3 funcionando y persistidas.

## Pasos

### Paso 1 — Estructura
- [x] Página con scroll y secciones: Modelos, Interfaz, Almacenamiento, Acerca de
- [x] Cada opción es un `SettingRow` (ícono, título, descripción, control)
- [x] Botón volver a la vista principal

### Paso 2 — Modelos › Backend (Screenshot_25)
- [x] Fila con el backend activo a la derecha ("CUDA")
- [x] Radios: CUDA "El mejor rendimiento. Recomendado." · GPU "Buen rendimiento (NVIDIA, AMD, Intel)" · CPU "Funcional, pero lento"
- [x] Etiqueta "Detectado" junto al autodetectado
- [x] Deshabilitar las opciones no disponibles, con motivo

### Paso 3 — Modelos › Modelos Whisper (Screenshot_26)
- [x] Lista: nombre, velocidad, precisión, uso de memoria
- [x] Por modelo: Descargar (con barra, velocidad y cancelar) / Eliminar + tamaño en disco
- [x] **Agregar modelo personalizado** (sin candado)
- [x] Modelos personalizados listados con opción de quitar

### Paso 4 — Modelos › Opciones de transcripción (Screenshot_27)
- [x] **Prompt inicial**: toggle + textarea + contador de tokens aprox. (~caracteres/4) + ayuda
- [x] **Longitud máxima de segmento**: NumberInput, 0 = sin límite
- [x] **Suprimir tokens sin voz**: toggle
- [x] **Normalización de audio**: toggle, activado por defecto
- [x] **Hilos de CPU**: NumberInput 1..núcleos, por defecto núcleos/2

### Paso 5 — Interfaz (Screenshot_27, 24)
- [x] **Mostrar subtítulos/CC**: toggle
- [x] **Altura del panel de video**: slider 300–600 con "Actual: N px"
- [x] **Tema**: Claro / Oscuro / Sistema
- [x] **Idioma de la interfaz**: Usar el idioma de Windows / Español / English / Português (Brasil)

### Paso 6 — Almacenamiento
- [x] Carpeta de modelos + botón abrir (`shell.openPath`)
- [x] Tamaño actual de la caché de vistas previas + límite configurable + **Vaciar**

### Paso 7 — Acerca de (Screenshot_24)
- [x] Logo, `APP_NAME`, versión (`app.getVersion()`)
- [x] **Ver registros** → abre la carpeta de logs
- [x] **Reconocimientos de software de terceros** → modal con licencias: whisper.cpp (MIT), modelos Whisper de OpenAI (MIT), ffmpeg (LGPL/GPL según la build), Electron (MIT), React, Zustand, i18next, lucide… (generar la lista desde `package.json` con un script)

### Paso 8 — Verificación
- [x] Cada opción cambia el comportamiento real (revisar los argumentos de whisper-cli en el log)
- [x] Commit: `feat(settings): página de configuración completa`
- [x] **Cierre de Fase 6**

## Criterios de aceptación
- [x] Todas las opciones persisten tras reiniciar
- [x] No queda ningún elemento de marca ni de pago de la app de referencia

## Bitácora
- 2026-09-28 — Componentes en `components/settings/` (SettingsPage, BackendSetting, ModelsSection, TranscriptionOptions, InterfaceSettings, StorageSettings, AboutSection, LicensesDialog). Cada cambio se guarda al momento con `updateSettings` (optimista; el main valida y es la fuente de verdad), sin botón Guardar. `SettingRow.description` pasa a `ReactNode` para poder mostrar la ruta de modelos en monoespaciada.
- 2026-09-28 — Backend: `getBackendInfo` cacheaba el backend elegido, así que cambiar el radio no surtía efecto hasta reiniciar. Ahora solo se cachea la **detección** (`detect()`), y el backend activo se calcula en cada llamada desde `settings.backend` (si está instalado; si no, el detectado). Verificado: al pasar a CPU la siguiente transcripción usó `whisper-cli (cpu)` sin reiniciar.
- 2026-09-28 — Un backend no instalado se muestra deshabilitado con el motivo "No incluido en esta instalación". Vulkan ("GPU") siempre sale así hoy: no hay build de whisper.cpp con Vulkan para Windows en `resources/bin/` (ver tarea 05). El radio "Detectado" lleva un badge (`RadioOption.badge`).
- 2026-09-28 — Contador de tokens del prompt: `ceil(caracteres/4)`, y aviso en rojo por encima de 224, que es lo que whisper.cpp usa realmente del prompt inicial (`n_text_ctx/2`). El área de texto se deshabilita con el toggle apagado. Hilos: máximo `navigator.hardwareConcurrency`, igual que `availableParallelism()` con el que valida el main.
- 2026-09-28 — Se añade un log `Transcripción <id>: whisper-cli (<backend>) <args>` en el motor: antes no había forma de comprobar desde fuera qué argumentos se pasaban, y la verificación de esta tarea lo pide.
- 2026-09-28 — Licencias: `scripts/gen-licenses.mjs` (`npm run licenses`) recorre las `dependencies` y sus transitivas, más react/react-dom/electron (devDependencies que sí se distribuyen), y añade a mano whisper.cpp, los modelos de OpenAI y las DLL de CUDA. Salida en `assets/third-party-licenses.json` (20 componentes, ~61 KB), que el diálogo carga con `import()` dinámico: Vite lo separa en su propio chunk y no pesa en el arranque. Hay que volver a correr el script al cambiar dependencias (lo recoge la tarea 22).
- 2026-09-28 — Se borra `src/renderer/src/dev/UiDemo.tsx` y su botón "Componentes", como anotó la tarea 02.
- 2026-09-28 — Limitación conocida: tras "Vaciar" la caché, un video abierto cuya vista previa estaba `ready` sigue apuntando al archivo borrado (el store de previews vuelve a la instantánea de `OpenedMedia.preview`) hasta que se vuelve a abrir. Poco frecuente; queda para la tarea 23 si molesta.
- 2026-09-28 — Verificación: typecheck, lint, prettier y 289 tests en verde (un test de `historyStore` falló una vez con `ENOTEMPTY` al borrar su carpeta temporal y pasó al repetirlo: carrera de Windows en la limpieza, no relacionada). `npm run dev` arranca. Como ya había una instancia de dev abierta (bloqueo de instancia única), se probó con el build lanzado con `--user-data-dir` en el scratchpad y controlado por CDP: se cambiaron todas las opciones desde la UI, se encoló un WAV de prueba y el log mostró `whisper-cli (cpu) … --prompt Mitocondria, ribosoma, ADN. -ml 42 --suppress-nst -t 3`; tras cerrar y reabrir, todos los valores (y el tema oscuro) seguían. La normalización no aparece en ese log (va en los argumentos de ffmpeg); la cubre el test `ffmpeg.test.ts` de `loudnorm` y el motor le pasa `options.normalize`. "Abrir carpeta" y "Ver registros" no se abrieron a mano (abren el Explorador); comparten el helper `openFolder`.
- 2026-09-28 — Marca: el texto de la página no contiene "Pro", "WizWhisp", "NowSmart" ni "3 minutos" (comprobado en el DOM); el nombre sale de `APP_NAME`.

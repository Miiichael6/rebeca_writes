# Proyecto: aplicación de escritorio de transcripción local con Whisper (Electron)

Quiero que construyas desde cero una aplicación de escritorio para Windows que transcriba video y audio a texto de forma 100 % local con Whisper, sin cuentas, sin límites de duración y sin funciones de pago. Te adjunto capturas de una app de referencia. Reproduce la **distribución y el estilo visual** de esas capturas, pero con **nombre, logo y textos propios**. No uses el nombre, el logo ni los textos de marca de la app de referencia.

Nombre provisional de la app **Transcriba** (déjalo en una sola constante para poder cambiarlo).

Trabaja por fases (ver al final), haz commits pequeños y al terminar cada fase deja la app ejecutable con `npm run dev`.

---

## 1. Stack técnico

- **Electron** (última versión estable) + **electron-vite** + **React** + **TypeScript** (modo `strict`).
- Estilos con CSS plano y variables CSS (tokens de diseño). Sin frameworks de UI pesados.
- Íconos con **lucide-react**.
- Estado del renderer con **Zustand**.
- i18n con **i18next** y **react-i18next**.
- Empaquetado con **electron-builder**, destino **NSIS** para Windows x64.
- Motor de transcripción **whisper.cpp** (binario `whisper-cli.exe`) ejecutado como proceso hijo desde el proceso principal.
- Conversión de medios con **ffmpeg** y **ffprobe** incluidos en la app (paquetes `ffmpeg-static` y `ffprobe-static`, o binarios copiados en `resources/bin`). Asegúrate de que en producción las rutas apunten fuera del `asar` (`asarUnpack`).
- Seguridad de Electron obligatoria. `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, toda comunicación por un `preload` con una API tipada (`window.api`). Nada de `remote`.
- Persistencia en `app.getPath('userData')` con archivos JSON (sin módulos nativos que requieran recompilar).

## 2. Motor de transcripción

### 2.1 Backends (igual que la pantalla de configuración de la referencia)
La app incluye tres builds de whisper.cpp en `resources/bin/`

```
resources/bin/cuda/whisper-cli.exe    (+ DLLs de CUDA)   "CUDA, el mejor rendimiento. Recomendado."
resources/bin/vulkan/whisper-cli.exe  (+ DLLs)           "GPU, buen rendimiento" (NVIDIA, AMD, Intel)
resources/bin/cpu/whisper-cli.exe                        "CPU, funcional pero lento"
```

- Crea un script `scripts/fetch-binaries.mjs` que descargue las builds oficiales de las releases de GitHub de `ggml-org/whisper.cpp` (CPU y CUDA 12). Si la build Vulkan no está publicada, documenta en el README cómo compilarla con `cmake -B build -DGGML_VULKAN=1` y cópiala a su carpeta.
- **Autodetección al primer arranque**. Si existe `nvidia-smi` y responde, usa CUDA. Si no, prueba Vulkan. Si no, CPU.
- **Fallback automático**. Si un backend falla al cargar (DLL faltante, sin VRAM), reintenta con el siguiente y muestra un aviso no bloqueante.
- El usuario puede cambiar el backend en Configuración (radio buttons como en la captura).

### 2.2 Modelos
Modelos GGML desde `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/`

| Modelo | Archivo | Velocidad | Precisión | Memoria aprox |
|---|---|---|---|---|
| Tiny | ggml-tiny.bin | Rápida | Básica | ~1 GB |
| Base | ggml-base.bin | Rápida | Aceptable | ~1 GB |
| Small | ggml-small.bin | Moderada | Buena | ~2 GB |
| Medium | ggml-medium.bin | Lenta | Muy buena | ~5 GB |
| Large v3 turbo | ggml-large-v3-turbo.bin | Moderada en GPU | Superior | ~6 GB |
| Large v3 | ggml-large-v3.bin | Lenta | Superior | ~10 GB |

- Ningún modelo viene en el instalador. Se descargan **desde la app** la primera vez que se eligen, con barra de progreso, velocidad, botón cancelar y reanudación si se corta (usa `Range`). Verifica el tamaño final.
- Guardar en `userData/models/`. En Configuración, lista de modelos con estado (descargado o no), tamaño en disco, botón **Descargar** y botón **Eliminar**.
- **Agregar modelo personalizado** (gratis, sin candado). Permite elegir un `.bin` GGML local y darle un nombre.
- **Sin límite de duración** en ningún modelo.

### 2.3 Pipeline por archivo
1. `ffprobe` para obtener duración, pistas de audio y si el video es reproducible en Chromium.
2. `ffmpeg` convierte a WAV PCM 16 kHz mono en una carpeta temporal (`-ar 16000 -ac 1 -c:a pcm_s16le`). Si **Normalización de audio** está activada, añade el filtro `loudnorm`. Si el archivo tiene varias pistas de audio, usa la primera (o la elegida por el usuario).
3. Ejecutar `whisper-cli` con `-m <modelo> -f <wav> -l <idioma|auto> -pp` y las opciones de configuración (`--prompt`, `-ml`, `--suppress-nst`, `-tr` si se pide traducir a inglés, `-t` hilos).
4. **Streaming en tiempo real**. Parsear stdout línea por línea (`[00:00:00.000 --> 00:00:05.120]  texto`) y emitir cada segmento al renderer apenas aparece. Parsear `progress = N%` de stderr para la barra de progreso.
5. Guardar resultado, borrar el WAV temporal, pasar al siguiente de la cola.
6. Cancelar debe matar el proceso (`taskkill /PID <pid> /T /F` en Windows) y limpiar temporales.

Encapsula todo esto en una clase `TranscriptionEngine` en el proceso principal con eventos `segment`, `progress`, `done`, `error`, y escribe **pruebas unitarias** (Vitest) para el parser de stdout, el parser de progreso y los exportadores.

## 3. Formatos admitidos

Aceptar **cualquier formato que ffmpeg pueda leer**. Como mínimo en el diálogo y en drag and drop

- Video `mp4, mkv, avi, mov, webm, m4v, wmv, flv, mpg, mpeg, ts, m2ts, 3gp, ogv`
- Audio `mp3, wav, m4a, aac, flac, ogg, opus, wma, aiff, amr, mka`
- Además una opción "Todos los archivos" que igual intenta con ffmpeg y muestra un error claro si no hay pista de audio.

## 4. Interfaz (seguir las capturas)

Estilo Windows 11 Fluent. Fondo general gris muy claro con un leve degradado verde agua en la parte superior, tarjetas blancas con bordes redondeados de 8 px y borde sutil, tipografía **Segoe UI Variable** / Segoe UI, color de acento rojo anaranjado `#E8432D` para botones principales, toggles activos, checkboxes y la barra lateral del ítem seleccionado. Soporta **modo claro y oscuro** siguiendo al sistema.

### 4.1 Ventana principal
Barra de título propia (frameless con `titleBarOverlay` o controles propios), con logo y nombre de la app a la izquierda y minimizar, maximizar y cerrar a la derecha.

**Columna izquierda (≈ 260 px)**
- Botón **Abrir archivo** (ícono carpeta) que permite **selección múltiple**. Si se eligen varios, van todos a la cola.
- Botón cuadrado con ícono de goma **Borrar historial**, con diálogo de confirmación.
- Campo **Filtrar por...** que filtra el historial por nombre y también por texto de la transcripción.
- **Historial** agrupado por fecha (Hoy, Ayer, Esta semana, Este mes, Anteriores). Cada ítem muestra ícono de archivo y nombre truncado con tooltip del nombre completo. El seleccionado tiene la barra roja a la izquierda y fondo gris. Clic derecho con menú **Abrir**, **Mostrar en el Explorador**, **Volver a transcribir**, **Renombrar**, **Eliminar del historial**. Un ítem en proceso muestra un indicador de progreso pequeño.
- Abajo, botón **Cola** con contador de pendientes, que abre el panel de cola.

**Barra superior del área derecha**
- Combo **Modelo Whisper** (solo muestra los descargados, más una opción "Descargar más modelos..." que abre Configuración).
- Combo **Idioma** con "Detectar automáticamente" más la lista completa de idiomas de Whisper con nombre en el idioma de la interfaz. Recordar la última elección.
- Opción **Traducir al inglés** (checkbox o dentro del combo de idioma).
- Botón con ícono de video para **mostrar u ocultar el panel de video**.
- Botón con ícono de engranaje para **Configuración**.
- Un botón **Transcribir** visible cuando hay un archivo cargado sin transcribir, y **Cancelar** mientras transcribe.

**Reproductor**
- Panel de video con altura configurable (300 a 600 px). Si el archivo es solo audio, mostrar una forma de onda o un fondo neutro con el nombre.
- Botón play/pausa, barra de progreso con buscador, tiempo actual y total, volumen y velocidad (0.5x a 2x).
- Los **subtítulos/CC** se muestran sobre el video usando los segmentos de la transcripción (se pueden ocultar desde Configuración).
- **Reproducción de cualquier formato**. Sirve los archivos locales por un protocolo propio (`media://`) registrado con `protocol.handle` que **soporte peticiones `Range`** implementadas a mano con `fs.createReadStream` (necesario para poder adelantar el video). Si Chromium no puede reproducir el códec (por ejemplo AVI, WMV, FLV, HEVC), generar en segundo plano una **vista previa** MP4 H.264 con `ffmpeg -preset ultrafast` en una caché dentro de `userData/preview-cache/` y mientras tanto reproducir solo el audio. Limitar la caché a un tamaño configurable y limpiarla al borrar el historial.

**Panel de transcripción**
- Encabezado con título, flechas arriba y abajo para navegar resultados y el cuadro **Buscar...** con ícono de lupa.
- **Transcripción en tiempo real**. Mientras se transcribe, cada segmento aparece en cuanto whisper lo produce. **El video se puede reproducir al mismo tiempo** que se transcribe, y el usuario puede ir viendo el texto crecer mientras mira el video. Mostrar una barra de progreso fina con porcentaje y tiempo restante estimado.
- Cada segmento muestra su marca de tiempo `[mm:ss]` en gris y el texto. **Clic en un segmento salta el video a ese momento.**
- Durante la reproducción, **resaltar el segmento actual**.
- **Búsqueda**. Resalta todas las coincidencias, muestra "3 de 12", Enter y las flechas saltan a la siguiente o anterior, Esc limpia. Ignorar mayúsculas y tildes.
- Edición en línea. Doble clic en un segmento permite corregir el texto (se guarda en el historial).

**Barra inferior**
- Botón **Copiar transcripción** al portapapeles, con aviso "Copiado".
- Checkbox **Unir líneas**. Activado, muestra el texto como párrafos continuos (unir segmentos, cortando en pausas largas o cada N frases). Desactivado, un segmento por línea con su tiempo. Afecta también a lo que se copia.
- Checkbox **Desplaz. auto**. Activado, la vista sigue al segmento que se está reproduciendo y, durante la transcripción, al último segmento nuevo. Si el usuario hace scroll manual, pausar el auto-scroll y mostrar un botón "Volver al actual".
- Botón **Exportar** con menú (igual que la captura)
  - como .txt con marcas de tiempo
  - como .txt
  - como .vtt
  - como .lrc
  - como .srt
  - **Guardar .srt junto al archivo** con el nombre `<archivo>.<código de idioma>.srt` (compatible con Jellyfin y Plex). Si ya existe, preguntar si reemplazar.
- Todos los exportadores en UTF-8, con tiempos correctos (SRT `00:00:01,430`, VTT `00:00:01.430`, LRC `[mm:ss.xx]`).

### 4.2 Cola
Panel lateral o modal con la lista de trabajos
- Agregar con **selección múltiple**, con **arrastrar y soltar** archivos o **carpetas completas** (recorrer subcarpetas y filtrar por extensiones admitidas) y desde el botón Abrir archivo.
- Estados **Pendiente**, **Procesando** (con %), **Completado**, **Error** (con mensaje), **Cancelado**.
- Reordenar arrastrando, quitar ítems, **Pausar cola**, **Reanudar**, **Cancelar actual**, **Limpiar completados**.
- Procesar de uno en uno. Cada trabajo guarda el modelo e idioma elegidos al encolarlo.
- Opción "Saltar archivos que ya tienen .srt al lado".
- Opción "Al terminar, guardar automáticamente el .srt junto al archivo".
- La cola **persiste** si se cierra la app y se retoma al abrirla (preguntando).
- Notificación de Windows al terminar la cola.
- Clic en un trabajo en proceso abre su vista en tiempo real.

### 4.3 Configuración (seguir las capturas)
Página con tarjetas agrupadas por secciones.

**Modelos**
- **Backend** con radio buttons CUDA, GPU, CPU y su descripción. Mostrar cuál se detectó.
- **Modelos Whisper** con la tabla de velocidad, precisión y uso de memoria, botones descargar y eliminar, y **Agregar modelo personalizado**.
- **Prompt inicial** con toggle y área de texto, y contador de tokens aproximado. Texto de ayuda "Indica al modelo que use ortografías o estilos específicos".
- **Longitud máxima de segmento (caracteres)** con campo numérico, 0 para sin límite.
- **Suprimir tokens sin voz** (toggle).
- **Normalización de audio** (toggle, activado por defecto).
- **Hilos de CPU** (numérico, por defecto la mitad de núcleos).

**Interfaz**
- **Mostrar subtítulos/CC** sobre el video (toggle).
- **Altura del panel de video** con slider de 300 a 600 px mostrando el valor actual.
- **Tema** claro, oscuro o sistema.
- **Idioma de la interfaz** con "Usar el idioma de Windows", Español, English, Português (Brasil). Deja la estructura lista para agregar más.

**Almacenamiento**
- Carpeta de modelos (con botón abrir), tamaño de caché de vistas previas con botón vaciar.

**Acerca de**
- Nombre, versión, **Ver registros** (abre la carpeta de logs), **Reconocimientos de software de terceros** con las licencias de whisper.cpp (MIT), modelos Whisper de OpenAI (MIT), ffmpeg (LGPL/GPL según la build), Electron y demás dependencias.

## 5. Datos y persistencia

- `userData/history/index.json` con la lista de entradas `{ id, filePath, fileName, durationSec, model, language, detectedLanguage, backend, createdAt, status }`.
- `userData/history/<id>.json` con los segmentos `{ start, end, text }[]` y ediciones.
- `userData/settings.json` y `userData/queue.json`.
- Escritura atómica (archivo temporal + rename) para no corromper datos.
- **Borrar historial** elimina entradas y transcripciones guardadas y la caché de vistas previas, pero **nunca** los archivos originales ni los .srt exportados.
- Si el archivo original se movió o borró, la entrada del historial sigue mostrando la transcripción y avisa que el video no está disponible, con opción "Buscar archivo...".
- Logs rotativos en `userData/logs/` (usa `electron-log`).

## 6. Calidad y detalles

- La UI nunca se congela. Todo lo pesado va en el proceso principal o en procesos hijos.
- Virtualizar la lista de segmentos (por ejemplo `@tanstack/react-virtual`) para transcripciones de varias horas.
- Atajos de teclado. `Espacio` play/pausa, `Ctrl+F` buscar, `Ctrl+O` abrir, `Ctrl+C` con foco en la transcripción copia todo, `←/→` retrocede o adelanta 5 s, `Ctrl+E` exportar.
- Mensajes de error claros en español cuando falta el modelo, falla el backend, no hay audio o no hay espacio en disco.
- Instancia única de la app. Abrir archivos desde "Abrir con" de Windows y arrastrándolos al ícono los agrega a la cola.
- Accesible. Foco visible, `aria-label` en botones de ícono, contraste AA.

## 7. Estructura sugerida

```
src/
  main/            # proceso principal (engine, cola, historial, modelos, protocolo media://, IPC)
    engine/        # TranscriptionEngine, parsers, detección de backend
    services/      # history, queue, settings, models, ffmpeg
  preload/         # API tipada expuesta como window.api
  renderer/        # React
    components/    # Sidebar, Toolbar, Player, TranscriptView, QueuePanel, ExportMenu, Settings/*
    store/         # Zustand
    i18n/          # es.json, en.json, pt-BR.json
    styles/        # tokens.css, theme-light.css, theme-dark.css
  shared/          # tipos compartidos y canales IPC
resources/bin/     # whisper-cli (cuda, vulkan, cpu), ffmpeg, ffprobe
scripts/           # fetch-binaries.mjs
tests/
```

## 8. Fases de trabajo

1. **Base**. Proyecto electron-vite + React + TS, ventana frameless, layout completo con datos de ejemplo, tema claro y oscuro, i18n.
2. **Motor**. Descarga de binarios, detección de backend, descarga de modelos con progreso, `TranscriptionEngine` con streaming de segmentos y pruebas del parser.
3. **Reproductor**. Protocolo `media://` con Range, reproducción sincronizada, clic para saltar, resaltado del segmento actual, vista previa para códecs no soportados.
4. **Transcripción en vivo**. Segmentos en tiempo real mientras el video se reproduce, búsqueda, unir líneas, desplazamiento automático, copiar, edición en línea.
5. **Cola e historial**. Selección múltiple, drag and drop de carpetas, persistencia, filtro, borrar historial, menú contextual.
6. **Exportar y Configuración**. Todos los formatos, guardar .srt junto al archivo, todas las opciones de la página de configuración.
7. **Empaquetado**. electron-builder NSIS, `asarUnpack` de binarios, ícono propio, README con cómo compilar, ejecutar y generar el instalador.

## 9. Criterios de aceptación

- Puedo arrastrar una carpeta con 50 videos de distintos formatos, se encolan todos y se procesan uno por uno sin intervención.
- Mientras un video se transcribe, puedo reproducirlo y ver aparecer el texto en tiempo real, y hacer clic en cualquier línea para saltar a ese momento.
- En una PC con NVIDIA usa CUDA automáticamente, y en una sin NVIDIA funciona con Vulkan o CPU sin instalar nada aparte.
- El instalador no pide instalar Python, CUDA, ffmpeg ni Whisper por separado.
- La búsqueda, copiar, unir líneas, desplazamiento automático, exportar en los 5 formatos y guardar .srt junto al video funcionan.
- Borrar historial pide confirmación y no toca archivos originales.
- Cerrar la app a mitad de una cola y volver a abrirla permite retomarla.
- `npm run test` pasa y `npm run build` genera el instalador.

Antes de empezar, revisa este documento, dime si ves algún punto técnico problemático y propón cómo resolverlo. Luego arranca por la fase 1.
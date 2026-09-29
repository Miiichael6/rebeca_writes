# 23 · Calidad y criterios de aceptación finales

**Estado:** 🔄 En progreso
**Fase:** 7 — Cierre · **Depende de:** 22 · **Doc:** §6, §9

## Objetivo
Verificar todo el documento de requisitos contra la app instalada antes de darla por terminada.

## Pasos

### Paso 1 — Rendimiento (§6)
- [ ] La UI nunca se congela durante: transcripción, ffmpeg, vista previa, descarga de modelos, carpeta grande
- [ ] Transcripción de más de 3 h fluida (lista virtualizada)

### Paso 2 — Atajos de teclado
- [ ] `Espacio` play/pausa
- [ ] `Ctrl+F` buscar
- [ ] `Ctrl+O` abrir
- [ ] `Ctrl+C` con foco en la transcripción copia todo
- [ ] `←/→` ±5 s
- [ ] `Ctrl+E` exportar
- [ ] Ninguno interfiere al escribir en un input

### Paso 3 — Mensajes de error (en español y traducidos)
- [x] Falta el modelo
- [x] Falla el backend (con fallback aplicado)
- [x] Archivo sin audio
- [x] Sin espacio en disco
- [x] Disco lleno durante la conversión con ffmpeg → `noDiskSpace` (antes salía `conversionFailed`)

### Paso 4 — Accesibilidad
- [ ] Navegación completa con teclado y foco visible
- [x] Riel de sliders y progreso ≥3:1 (WCAG 1.4.11): `--track` #8a8a8a claro / #7a7a7a oscuro
- [x] `aria-label` en todos los botones de ícono
- [x] Contraste AA en claro y oscuro

### Paso 5 — Criterios de aceptación §9
- [ ] Carpeta con 50 videos de formatos mixtos → se encolan y procesan solos
- [ ] Reproducir mientras se transcribe, ver el texto en vivo, clic para saltar
- [ ] CUDA automático con NVIDIA; Vulkan o CPU sin NVIDIA, sin instalar nada — **falla con la app instalada**: falta la descarga de CUDA (tarea 05, paso 6.4)
- [x] El instalador no pide Python, CUDA, ffmpeg ni Whisper
- [ ] Búsqueda, copiar, unir líneas, desplazamiento automático
- [ ] Exportar en los 5 formatos y guardar .srt junto al video
- [ ] Borrar historial pide confirmación y no toca los originales
- [ ] Cerrar a mitad de la cola y reabrir permite retomar
- [x] `npm run test` pasa
- [x] El build genera el instalador

### Paso 6 — Revisión de marca
- [x] Ningún nombre, logo ni texto de la app de referencia (buscar "WizWhisp", "NowSmart", "Pro")

### Paso 7 — Cierre
- [ ] Actualizar el tablero en `00_README.md` (todo ✅)
- [ ] Tag `v1.0.0`

## Criterios de aceptación
- [ ] Todos los puntos de §9 marcados

## Bitácora
- 2026-09-28 — **Automático:** `npm run test` 291/291, `typecheck` y `lint` limpios. `npm run build:win` genera `dist/Transcriba-Setup-1.0.0.exe` (128 MB); según D4 el instalador sale de `build:win`, no de `build`. Que el instalador no pide Python/CUDA/ffmpeg/Whisper quedó probado en Windows Sandbox en la 22.
- 2026-09-28 — **Atajos (revisión de código, falta probarlos en la app):** Espacio y ←/→ (`store/player.ts`) ignoran input, textarea, select, button, enlaces, contenteditable y menús, y no actúan con un diálogo abierto. Ctrl+O/F/E se enganchan en `window` con Ctrl solo (sin Alt/Shift) y no escriben nada en un input. Ctrl+C (`TranscriptView`) deja la copia nativa en inputs o con selección. No se marcan hasta probarlos en vivo.
- 2026-09-28 — **Errores:** los cuatro viajan como `ErrorCode` y el renderer los traduce (`errors.*`). Las claves de es, en y pt-BR coinciden (a en solo le faltan las formas `_many`, que el inglés no usa). **Bug:** con el disco lleno ffmpeg no devuelve ENOSPC, solo escribe "No space left on device" en stderr, y salía "No se pudo convertir el audio". Se añadió `conversionErrorCode()` en `services/ffmpeg.ts` (con test). El texto de `noDiskSpace` decía "…para descargar el modelo" aunque también sale al transcribir; ahora es genérico en los tres idiomas.
- 2026-09-28 — **Accesibilidad:** `Button` exige `aria-label` por tipo cuando no tiene texto. Los `<button>` sueltos (Player, NumberInput) lo llevan. `:focus-visible` global, con estilo propio en select, checkbox, radio, slider y menú. Contraste calculado con la fórmula WCAG: todo el texto ≥4.5 en sus fondos reales (el peor caso es `--accent-text` sobre `--bg-selected`, con 4.54 en claro y 4.59 en oscuro). `--text-3` sobre `--bg-selected` daría 4.28, pero esa combinación no se usa. El riel de los sliders daba 2.4 en claro y 2.1 en oscuro, por debajo del 3:1 de WCAG 1.4.11, y se oscureció. También afecta al pulgar de la barra de desplazamiento.
- 2026-09-28 — **Marca:** sin coincidencias de "WizWhisp", "NowSmart" ni la palabra "Pro" fuera de `plans/`. ⚠️ `APP_NAME` sigue siendo `Transcriba` (instalador `Transcriba-Setup`, `appId com.transcriba.app`), pero CLAUDE.md ya dice que el nombre es **RebecaWrites**. Falta que el usuario decida si se renombra antes de la v1.0.0.
- 2026-09-28 — **Bloqueo §9:** esta PC tiene una RTX 3050 y en dev usa CUDA (`resources/bin/cuda`, 1,1 GB). El instalador lo excluye (D2 = descargable) y la descarga desde la app no existe (05, paso 6.4), así que la app instalada cae a CPU. El criterio "CUDA automático con NVIDIA" no se cumple. No se pone el tag `v1.0.0`.
- 2026-09-28 — **Falta prueba manual en la app instalada:** paso 1 (UI fluida; más de 3 h), paso 2 (atajos en vivo), navegación con teclado, y en el §9 la carpeta de 50 videos, reproducir mientras transcribe, búsqueda/copiar/unir/autoscroll, exportar en 5 formatos + .srt, borrar historial y retomar la cola. Los tests cubren parte (`historyStore`: `clear` solo borra dentro de su carpeta; `queueService`: al arrancar con pendientes espera a Retomar), pero no sustituyen la prueba.

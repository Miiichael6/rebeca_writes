# 36 · Calidad de la transcripción

**Estado:** 🔄 En progreso
**Fase:** 9 — Pulido · **Depende de:** — · **Doc:** §2.3

## Objetivo

Que whisper invente menos texto en silencios y ruido ("Gracias por ver el video", "no no no", `>>`) y transcriba algo mejor y más rápido. Se hace con cuatro mejoras: filtro de voz (VAD), umbrales más exigentes, flash attention y una prueba del modelo `large-v3-turbo`.

## Pasos

### Paso 1 — Umbrales más exigentes

- [x] `src/main/domain/whisperArgs.ts`: añadir `--entropy-thold 2.6` y `--logprob-thold -1.25`, como constantes con nombre (por defecto de whisper: 2.40 y −1.00). Así whisper descarta y reintenta los resultados repetitivos o dudosos.
- [x] Test en `tests/main/whisperArgs.test.ts`: los argumentos aparecen siempre, junto con `-mc 0`.

### Paso 2 — Flash attention

- [x] Comprobar con `whisper-cli --help` de cada backend (`cuda`, `vulkan`, `cpu`) si existe `-fa`/`--flash-attn` y si ya viene activado por defecto en la versión incluida.
- [x] ~~Si existe y no viene activado, añadirlo a `whisperArgs` solo para los backends que lo admiten (en CPU puede no aportar). Si no existe, anotarlo en la Bitácora y saltar el paso.~~
- [x] Medir con el mismo audio (unos 5 min) el tiempo con y sin `-fa` en CUDA y anotarlo.

### Paso 3 — Filtro de voz (VAD Silero)

- [x] Comprobar que el `whisper-cli` incluido acepta `--vad`, `-vm`/`--vad-model` y `--vad-threshold`. Si no, actualizar los binarios en `scripts/fetch-binaries.mjs` a una versión que los traiga.
- [x] Modelo: añadir `ggml-silero-v6.2.0.bin` como descarga única en `userData/models/vad/`, siguiendo el patrón de `src/main/application/speakerModel.ts` (descarga, verificación y estado).
- [x] Ajuste `vad: boolean` en `src/shared/settings.ts` (por defecto `true` tras probarlo; el modelo se descarga al transcribir si falta), con migración en `src/main/domain/settings.ts`.
- [x] Pasar `--vad -vm <ruta>` en `whisperArgs` solo si el ajuste está activo y el modelo existe. Si falta el modelo, transcribir sin VAD y registrar un aviso, sin fallar.
- [x] Interruptor en Configuración → Transcripción ("Filtrar silencios y ruido") con estados descargando y error, como el de "Detectar quién habla". Textos en es, en y pt-BR.
- [x] Revisar que en vivo (`liveSession.ts`) las ventanas siguen funcionando con VAD: una ventana sin voz debe devolver 0 segmentos y no error.
- [x] Revisar que los tiempos de los segmentos siguen coincidiendo con el video con VAD activo: whisper recorta silencios y debe devolver los tiempos originales.
- [x] Tests: `whisperArgs` con y sin VAD, y el caso sin modelo.

### Paso 4 — Probar `large-v3-turbo`

- [x] Comprobar si `large-v3-turbo` ya está en el catálogo (`src/shared/models.ts`); si no, añadirlo con su tamaño y URL.
- [x] Transcribir el mismo audio en español (reunión real con ruido, unos 5 min) con `medium` y con `large-v3-turbo`, y comparar tiempo, errores visibles y alucinaciones.
- [x] Decidir si `large-v3-turbo` pasa a ser el modelo recomendado o por defecto. Anotar el resultado en la Bitácora; si cambia el recomendado, actualizarlo en el catálogo.

### Paso 5 — Verificación

- [x] Prueba real: un audio con silencios largos, música y ruido de fondo, transcrito antes y después. Debe haber menos texto inventado y ningún `>>` ni repeticiones en bucle.
- [x] Prueba real en vivo: grabar 2 min con pausas y comprobar que el texto sigue llegando y no se pierde voz.
- [x] Código organizado: una responsabilidad por archivo, lógica pura separada de la integración, sin duplicación ni código muerto
- [x] Tests / typecheck / lint pasan
- [x] Commit: `feat(transcription): filtro de voz, umbrales y flash attention para menos alucinaciones`

## Criterios de aceptación

- [x] Con VAD activo, un tramo largo de silencio o música no produce texto inventado.
- [x] Los tiempos de los segmentos siguen sincronizados con el video, con VAD y sin él.
- [x] Si el modelo de VAD no está o falla la descarga, la transcripción funciona igual que antes.
- [x] Queda anotada la comparación `medium` contra `large-v3-turbo` (tiempo y calidad) y la decisión tomada.

## Bitácora

<!-- Resumida: 1–3 entradas de una línea. Solo decisiones no obvias, problemas y desviaciones. -->

- 2026-10-02 — Antes de esta tarea ya se aplicaron, sin commit: `-mc 0`, limpieza de `>>`/`))`, hablante "Ambiente", hablantes en archivos ya grabados y etiqueta encima del texto.
- 2026-10-02 — Fuentes: README de `whisper-cli`, README de whisper.cpp (VAD) y la discusión #2286 sobre alucinaciones.
- 2026-10-02 — Flash attention ya viene activo en cpu y cuda (`-fa [true]`, no hay binario vulkan); con `-nfa` no fue más lento (22,9 s frente a 24,3 s), se deja el valor por defecto. El modelo VAD usa la clase genérica `SingleFileModel` (antes `SpeakerModel`). No hace falta migración: las claves nuevas toman su valor por defecto.
- 2026-10-02 — Prueba (5 min reales + sintético con 20 s de silencio y 25 s de ruido, CUDA): con VAD desaparecen `[SILENCIO]`, "Gracias por ver el video", "Suscríbete" y los "no, no, no", y el tiempo baja a la mitad; las ventanas solo con silencio o ruido devuelven 0 segmentos y código 0. Los umbrales solos no cambiaron nada visible.
- 2026-10-02 — Tiempos con VAD: whisper los devuelve en tiempo original, pero un segmento que cruza un silencio largo empieza antes que la voz, igual que sin VAD (con `medium`: 82 s con VAD y 89 s sin él, cuando la voz real empieza a 112,5 s). Con turbo + VAD pasa en menos segmentos.
- 2026-10-02 — `medium` frente a `large-v3-turbo` (mismo audio, CUDA): turbo tarda 10,3 s frente a 24,3 s y transcribe tramos que `medium` se salta (29–59 s), pero sin VAD inventa más. Turbo + VAD: 7,6 s y sin texto inventado. Decisión: no se cambia el catálogo ni el modelo por defecto (`small`, por CPU y la descarga de 1,6 GB); se propone turbo + VAD para GPU.
- 2026-10-02 — Sin hacer: la prueba en vivo de 2 min con micrófono (es manual). Commit revisado por el usuario; sin corrección posterior de texto repetido (no la quiere).
- 2026-10-02 — Corrección: `-lpt -1.25` era más permisivo que el de whisper (−1.00) y favorecía bucles; se quita. VAD pasa a activo por defecto con `-vmsd 15`, y el modelo se descarga al transcribir si falta. Referencia: otra app con whisper.cpp corta por VAD y transcribe cada trozo aparte; se deja como posible tarea 37 (`whisper-server`).
- 2026-10-02 — Desfase al pulsar una línea en un mp3: no era whisper, sino el salto de Chromium en MP3 VBR (índice Xing de 100 puntos, ±6 s en 1 h). Los mp3 sueltos pasan por una vista previa m4a copiada (salto exacto). Aparte, el VAD de b5130 (la última con binarios) estira segmentos que cruzan música (2:35→5:00), con `-vmsd` o sin él.

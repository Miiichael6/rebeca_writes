# 35 · Detector de persona al grabar

**Estado:** ✅ Terminada (prueba real con dos voces pendiente)
**Fase:** 9 — Pulido · **Depende de:** 29 · **Doc:** petición del usuario (2026-10-02)

## Objetivo

Mientras se graba (tarea 29), cada segmento transcrito queda etiquetado con quién habla: **Persona 1**, **Persona 2**, etc. La etiqueta se ve en la transcripción, se puede renombrar ("Persona 1" → "Ana") y sale en los exportadores.

## Enfoque (D13: sherpa-onnx; D14: "Usted")

Dos capas, de más fácil a más difícil:

1. **Por canal (gratis y exacto)**: en la fuente *Ambos* el micrófono y el sistema llegan separados antes de mezclarse. Lo del micrófono es "tú"; lo del sistema son los demás.
2. **Por voz (diarización)**: dentro de un mismo canal (varios participantes en la llamada) se saca una huella de voz (embedding) por segmento y se agrupa en línea con las huellas ya vistas; si no se parece a ninguna, nace una Persona nueva. Motor (D13): modelo de embeddings ONNX de sherpa-onnx ejecutado como binario sidecar (sin módulos nativos en Node).

## Pasos

### Paso 1 — Modelo de datos
- [x] `src/shared/types.ts` → `Segment.speaker?: string` (id estable `p1`, `p2`…) y `HistoryEntry.speakers?: Record<string, string>` (id → nombre mostrado; no existe un tipo `Transcription`)
- [x] `src/main/domain/history.ts`: migración que acepta transcripciones antiguas sin hablantes

### Paso 2 — Lógica pura de agrupación
- [x] `src/main/domain/speakers/clusterSpeakers.ts`: `assignSpeaker(embedding, known, threshold)` → id existente o nuevo; centroide que se actualiza; sin IO
- [x] `src/main/domain/speakers/alignSpeakers.ts`: asigna a cada segmento de whisper el hablante que más tiempo cubre su intervalo
- [x] `src/main/domain/speakers/ownVoiceTimeline.ts`: turnos de "Usted" en *Ambos* a partir del nivel del micrófono frente al del sistema
- [x] Tests: dos voces alternadas, una voz sola, silencio, umbral borde, orden de llegada

### Paso 3 — Extractor de huellas
- [x] Puerto `application/ports/speakerEmbedder.ts` y adaptador `infrastructure/speakers/` (sherpa-onnx, D13)
- [x] Descarga del modelo con el mismo mecanismo de `modelService`

### Paso 4 — Integrar en la grabación
- [x] `application/liveSession.ts`: tras cada lote de segmentos, pedir la huella del tramo de audio y etiquetar antes de enviarlo al renderer
- [x] `micRecording.ts` / `recordingSources.ts`: en *Ambos*, marcar el canal de origen y mapear el micrófono al hablante fijo "Usted" (D14); el resto se agrupa por voz como Persona 1, 2…
- [x] Evento de segmentos con `speaker` en `shared/ipc.ts`

### Paso 5 — UI
- [x] `TranscriptView`: etiqueta de hablante con color por persona al cambiar de voz
- [x] Renombrar persona (clic en la etiqueta) que se guarda en `speakers`
- [x] Interruptor "Detectar quién habla" en Configuración; textos en es, en y pt-BR

### Paso 6 — Exportar
- [x] Exportadores (`shared/exporters.ts`): prefijo `Persona 1:` en TXT/SRT/VTT cuando haya hablantes

### Paso 7 — Verificación
- [ ] Prueba real: grabar con dos voces distintas (o un vídeo con dos personas) y ver Persona 1 / Persona 2 al vuelo
- [ ] Prueba en *Ambos*: yo por micrófono y un vídeo por el sistema se separan
- [x] Código organizado: una responsabilidad por archivo, lógica pura separada de la integración, sin duplicación ni código muerto
- [x] Tests, `npm run typecheck` y lint pasan; `npm run dev` arranca
- [x] Commit: `feat(speakers): detectar quién habla al grabar (tarea 35)`

## Criterios de aceptación

- [ ] Grabando con dos personas, los segmentos se etiquetan Persona 1 y Persona 2 de forma consistente durante toda la sesión
- [x] Renombrar una persona se refleja en toda la transcripción y en los exportados
- [x] Con el interruptor apagado no hay etiquetas ni coste extra de CPU
- [x] Las transcripciones anteriores se abren sin cambios

## Bitácora

- 2026-10-02 — D13: sherpa-onnx sidecar. D14: el micrófono propio es "Usted"; los demás por voz como Persona N (se asumió ambas capas desde el inicio).
- 2026-10-02 — DLL de sherpa-onnx v1.13.8 con script propio (`npm run fetch:speaker`), no en el repo. CAM++ medido con el sidecar: misma voz 0,95–0,99, voces distintas 0,16–0,36 → umbral 0,5.
- 2026-10-02 — `history.speakers` guarda solo los nombres cambiados; los de por defecto los traduce el renderer, que manda los nombres ya resueltos al exportar. Con "Unir líneas", el párrafo se corta al cambiar de hablante.
- 2026-10-02 — Sin prueba con dos voces ni en *Ambos* (aquí no se puede hablar al micrófono); lo cubren los tests de SpeakerLabeler y la medición de arriba. Queda para el usuario.

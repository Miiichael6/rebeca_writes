# 41 · Diccionario de reemplazos: motor e interruptor

**Estado:** ✅ Terminada (prueba del interruptor en la app pendiente)
**Fase:** 9 — Pulido · **Depende de:** — · **Doc:** petición del usuario (2026-11-08)

## Objetivo

Un diccionario global que corrige palabras que whisper oye mal (`id trabajo` → `ID_Trabajo`, `cua` → `QA`, `jompas` → `home pass`). Funciona en dos capas: las palabras correctas se pasan a whisper con `--prompt` para que acierte desde el principio, y lo que siga saliendo mal se reemplaza en cada segmento. Se activa y desactiva desde el menú rápido de la barra (debajo de «Detectar voz»).

## Enfoque

- Entrada: `{ id, spoken: string[], written: string, plural: boolean, enabled: boolean }`. Varias formas habladas por palabra (`cua`, `kiu ei`, `q a`).
- Comparación sobre texto normalizado (`normalize()` de `@shared/normalize`: sin mayúsculas ni tildes) que además ignora puntuación y espacios de más entre las palabras. Solo palabras completas (`cua` no toca `cuadro`). Primero la forma hablada más larga.
- `plural: true` acepta `s`/`es` al final y lo conserva: «los id trabajos» → «los ID_Trabajos».
- Sin coincidencia aproximada: da demasiados falsos positivos (`jompas` ≈ `compas`).
- Texto original: si el diccionario cambia un segmento, se guarda `originalText` (el de whisper) sin marcar `edited`, así «Restaurar original» sigue funcionando.
- `--prompt`: las formas `written` activas se juntan al prompt de Configuración si este está activo, y se recortan para no pasar de ~220 tokens.

## Pasos

### Paso 1 — Dominio puro y tests
- [x] `src/shared/dictionary.ts`: tipo `DictionaryEntry`, `applyDictionary(text, entries)` (normalizar, palabras completas, la más larga primero, plural) y `dictionaryPrompt(entries, basePrompt)` (junta y recorta).
- [x] `tests/main/dictionary.test.ts` (convención del repo): los casos del objetivo, plural, mayúsculas y tildes, `cua` dentro de `cuadro` (no cambia), puntuación entre palabras, solapes (`id` frente a `id trabajo`), entradas desactivadas, recorte del prompt.

### Paso 2 — Persistencia y ajuste
- [x] `src/main/infrastructure/persistence/jsonDictionaryRepository.ts`: `userData/dictionary.json` escrito con `fsAtomic`; validador de entradas en `src/main/domain/` (mismo estilo que `domain/settings.ts`).
- [x] Ajuste `dictionaryEnabled` (false por defecto) en `src/shared/settings.ts` y `src/main/domain/settings.ts`; canales IPC `dictionary:get` y `dictionary:set` en `src/main/ipc.ts` y funciones tipadas en el preload (`index.ts` e `index.d.ts`).

### Paso 3 — Aplicarlo al transcribir
- [x] Con `dictionaryEnabled`, `transcribeOptionsFrom` (o quien arme las opciones en main) añade `dictionaryPrompt(...)` al `--prompt`.
- [x] Reemplazar en cada segmento antes de emitirlo/guardarlo: `application/transcriptionPipeline.ts` (archivo, cola, carpetas) y `liveSession.ts`/`pipelineChunkTranscriber.ts` (en vivo y micrófono). Un solo helper `correctSegment(segment, entries)` en `@shared/dictionary`, sin repetir lógica.
- [x] Tests del pipeline con diccionario (`tests/main/transcriptionPipelineDictionary.test.ts`) y del archivo (`dictionaryFile.test.ts`); dobles del pipeline en `tests/main/pipelineFixture.ts`.
- [x] «Restaurar original» del menú del segmento aparece también si solo lo cambió el diccionario (`TranscriptView/ui/SegmentList.tsx`).

### Paso 4 — Interruptor en el menú rápido
- [x] `Toolbar/ui/ChoiceFields.tsx`: item «Diccionario» con interruptor (`keepOpen`, como «Detectar voz»), icono de `lucide-react` (`BookA`), hook `useDictionaryChoice` en `Toolbar/application/` y su puerto en `infrastructure/storePorts.ts`.
- [x] Textos en es, en y pt-BR (`toolbar.dictionary`, `toolbar.dictionaryHint`: p. ej. «Cambia palabras al transcribir»).

### Paso 5 — Verificación
- [x] Tests / typecheck / lint pasan.
- [x] A mano (pipeline real, sin la UI): con un `dictionary.json` escrito a mano y el diccionario encendido, transcribir un audio donde se diga «cua» y «los id trabajos»; apagarlo y comprobar que ya no cambia.
- [ ] Interruptor del menú rápido en la app: encender, transcribir, apagar, reiniciar y ver que se recuerda.
- [ ] `npm run dev` arranca.
- [x] Commit: `feat(diccionario): reemplazar palabras al transcribir e interruptor en el menú rápido`

## Criterios de aceptación

- [x] «los id trabajos» sale como «los ID_Trabajos» y «cua» como «QA», pero «cuadro» no se toca.
- [ ] El interruptor del menú rápido activa y desactiva el diccionario sin cerrar el menú, y el cambio se recuerda al reiniciar.
- [x] Un segmento cambiado por el diccionario se puede restaurar al texto de whisper.
- [x] Con el diccionario apagado, el `--prompt` y los segmentos quedan igual que antes.

## Bitácora

- 2026-11-08: El diccionario se aplica dentro de `TranscriptionPipeline` (dep `dictionary` → `DictionaryService.active()`): cubre archivo, cola, carpetas y en vivo sin tocar `liveSession` ni `transcribeOptionsFrom`, y no confía en lo que mande el renderer.
- 2026-11-08: «Restaurar original» exigía `edited`; ahora usa `restorableOriginal()` (`originalText` distinto del texto), así sirve también para los cambios del diccionario. El prompt: palabras del diccionario al final (whisper conserva la cola) y el prompt base recortado por delante; presupuesto ~550 caracteres (220 tokens × 2,5).
- 2026-11-08: Verificado con whisper real (small, CPU) sobre un audio TTS: «los id trabajos» → «los ID_Trabajos», «cuadro» intacto, `--prompt` igual que antes con el diccionario apagado. El TTS hizo que whisper oyera «Kigwa» y «humpas»: sin forma hablada para eso no se tocan (sin coincidencia aproximada, a propósito). `npm run dev` y la prueba del interruptor quedan para el usuario: la app instalada estaba abierta y comparte `userData` y el bloqueo de instancia única con dev; se comprobó `electron-vite build` en su lugar.
- 2026-11-08: Cerrada con la prueba del interruptor en la app y `npm run dev` pendientes del usuario, para empezar la 42 encima.

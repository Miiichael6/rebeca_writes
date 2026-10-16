# 38 · Copiar para IA

**Estado:** ✅ Terminada (falta probarla a mano en `npm run dev`)
**Fase:** 9 — Pulido · **Depende de:** — · **Doc:** —

## Objetivo

Un botón en la barra inferior que copia la transcripción lista para pegarla en Claude u otra IA, sin gastar tokens en ruido: sin marcas como `[BLANK_AUDIO]` ni palabras o frases repetidas más de 5 veces seguidas. Solo cambia lo copiado; la transcripción guardada no se toca.

## Pasos

- [x] `src/renderer/src/lib/aiText.ts`: `stripNonSpeech` (quita `[..]`, `(..)`, `*..*`, ♪), `collapseRepeats` (n-gramas de 1 a 12 palabras repetidos más de 5 veces seguidas pasan a uno), `cleanSegments` y `aiText` (una línea por segmento con su marca de tiempo; el nombre del hablante solo cuando cambia).
- [x] `copyTranscriptForAi()` en `lib/copyTranscript.ts`: copia y avisa con el % ahorrado frente a la copia normal.
- [x] Botón ✨ en `BottomBar` (puerto `copyForAi`), desactivado sin transcripción.
- [x] Textos `bottomBar.copyForAi` y `bottomBar.copiedForAi` en es, en y pt-BR.
- [x] Tests en `tests/renderer/aiText.test.ts`.
- [ ] Probar a mano con una transcripción con bucles y `[BLANK_AUDIO]`.
- [x] Tests / typecheck / lint pasan
- [x] Commit

## Bitácora

- 2026-10-15 — Va contra la regla de no filtrar texto repetido, pero solo en lo copiado y a petición expresa del usuario; los bucles de whisper se siguen corrigiendo en origen.
- 2026-10-15 — Primero se quitaban las marcas de tiempo; el usuario las quiere: ahora solo se quitan lo repetido y las marcas de no habla.

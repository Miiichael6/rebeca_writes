# 43 · Diccionario por áreas (trabajo, clases…)

**Estado:** ⬜ Pendiente
**Fase:** 9 — Pulido · **Depende de:** 42 · **Doc:** petición del usuario (2026-11-09)

## Objetivo

Separar las palabras del diccionario por área (p. ej. «Trabajo», «Clases») y elegir en el menú rápido qué áreas están activas. Así solo las palabras del área que toca van al `--prompt` de Whisper, que admite unos 220 tokens, y se reemplazan en el texto. Con todas las palabras juntas, las de un área dejan sin sitio a las demás.

## Enfoque

- Cada palabra puede tener un área (`area?: string`). Las palabras sin área se aplican siempre.
- Las áreas activas se guardan en `settings.json` junto al interruptor del diccionario.
- Menú rápido: debajo del interruptor del diccionario, una casilla por área (selección múltiple). Las áreas salen de las propias palabras; no hay una lista aparte que mantener.
- «Aplicar diccionario» usa las áreas activas en ese momento.

## Pasos

### Paso 1 — Modelo y motor
- [ ] `DictionaryEntry.area?: string` en `src/shared/dictionary.ts`, con `DICTIONARY_VERSION` compatible: un archivo sin áreas sigue cargando igual.
- [ ] `activeEntries` filtra por las áreas activas. El `--prompt` y el reemplazo usan esa lista. Tests.
- [ ] Ajuste `dictionaryAreas: string[]` en settings. La transcripción y «Aplicar diccionario» lo leen en el main.

### Paso 2 — Ventana del diccionario
- [ ] Columna «Área»: un campo con sugerencias de las áreas que ya existen.
- [ ] Filtro por área sobre la tabla, junto a la búsqueda.
- [ ] Importar y exportar el área: cuarta columna del CSV (`hablado;escrito;plural;área`) y campo `area` en el JSON. Un CSV de 3 columnas sigue valiendo. Test de ida y vuelta.

### Paso 3 — Menú rápido
- [ ] Casillas de áreas bajo el interruptor del diccionario (solo si hay áreas).
- [ ] Textos en es, en y pt-BR.

### Paso 4 — Verificación
- [ ] Tests / typecheck / lint pasan.
- [ ] A mano: importar el CSV de trabajo con área «Trabajo», activar solo «Clases» y ver que «somacil» no se cambia; activar «Trabajo» y ver que sí.
- [ ] `npm run dev` arranca.
- [ ] Commit: `feat(diccionario): áreas de palabras y selector de áreas activas en el menú rápido`

## Criterios de aceptación

- [ ] Una palabra con área solo se aplica cuando su área está activa; una sin área, siempre.
- [ ] Las áreas activas siguen igual al reiniciar la app.
- [ ] Un diccionario de antes (sin áreas) funciona igual que hoy.
- [ ] Exportar e importar conserva el área de cada palabra.

## Bitácora

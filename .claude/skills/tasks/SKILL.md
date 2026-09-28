---
name: tasks
description: Flujo de trabajo por tareas numeradas en plans/tasks/ (pending → in_progress → done) con pasos en checkbox, criterios de aceptación y bitácora; si una tarea resulta muy compleja mientras se está trabajando, se subdivide sobre la marcha en subtareas N.1, N.2 vinculadas a la tarea padre (las subtareas nunca se crean de antemano al planificar). Úsala cuando el usuario diga "haz la tarea N" o "haz la 5.1", "sigue con la siguiente tarea", "¿cómo va el tablero?", "planifica/divide esto en tareas", "subdivide la tarea N", o invoque /tasks. Cubre tres modos: planificar (convertir un concepto o spec en tareas), ejecutar una tarea de principio a fin (subdividiendo si hace falta), y reportar el estado del tablero.
argument-hint: "[N | N.M | siguiente | estado | subdividir N | planificar <concepto>]"
---

# Tareas numeradas con tablero

Un concepto grande se parte en **tareas numeradas** (`01_`, `02_`...). Cada tarea se detalla en **pasos con checkbox** y termina con **verificación** y **criterios de aceptación** que tienen que cumplirse. El usuario solo dice "haz la 09" y la tarea se completa entera, dejando rastro en el archivo y en el tablero.

Las subtareas (`N.1`, `N.2`...) **no se planifican de antemano**: solo aparecen si, ya trabajando una tarea, esta resulta mucho más compleja de lo previsto. Es la excepción, no la regla — la mayoría de tareas no tienen subtareas.

## Estructura

```
plans/tasks/
├── 00_README.md          ← tablero, decisiones pendientes, diagrama de dependencias
├── pending/              ← ⬜ no iniciada · ⛔ bloqueada
├── in_progress/          ← 🔄 la familia que se está trabajando (padre + subtarea activa)
└── done/                 ← ✅ todos los pasos, criterios y subtareas cumplidos
```

El estado de una tarea vive en **tres sitios** que siempre deben coincidir: la carpeta donde está el archivo, su línea `**Estado:**` y su fila en el tablero de `00_README.md` (enlace + columna Estado). Para una subtarea hay un cuarto: su línea en la sección `## Subtareas` de la padre.

Todo el contenido de `plans/` se escribe en **español**. Plantillas: [plantilla_task.md](plantilla_task.md), [plantilla_subtask.md](plantilla_subtask.md) y [plantilla_readme.md](plantilla_readme.md).

## Subtareas (N.M) — solo surgen al ejecutar, nunca al planificar

Es la **excepción**, no la regla. Lo normal es que una tarea se resuelva con sus pasos y, si aparece algo nuevo, se añada como otra línea `- [ ]`. Solo cuando, **ya trabajando la tarea**, resulta ser mucho más compleja de lo previsto (muchos casos pendientes que revisar, una parte que resultó mucho más grande de lo previsto, trabajo que no se puede cerrar en esta sesión), en vez de inflarla o cerrarla a medias, **se subdivide**.

Una subtarea nunca se crea en el modo Planificar ni antes de empezar a trabajar una tarea: solo existe una vez que el trabajo real reveló que hacía falta.

- **Nombre**: `NN.M_nombre.md`, con el mismo prefijo que la padre. Ejemplo: padre `05_project_and_testings.md` → `05.1_casos_import.md`, `05.2_revision_errores.md`. Si una subtarea también necesita dividirse: `05.1.1_...` (máximo 3 niveles).
- **Vive en las mismas carpetas** (`pending/`, `in_progress/`, `done/`) y tiene su propio **Estado**, pasos, verificación, criterios y bitácora ([plantilla_subtask.md](plantilla_subtask.md)).
- **Vínculo en ambos sentidos**:
  - La subtarea lleva `**Tarea padre:** [05 · Título](../<carpeta>/05_nombre.md)` y un **Origen** que dice de qué paso o revisión de la padre sale.
  - La padre tiene una sección `## Subtareas` con una línea por hija: `- [ ] [05.1 · Título](../pending/05.1_nombre.md) — ⬜ Pendiente`. El paso de la padre que originó la subtarea se reescribe como `- [ ] → ver 05.1`.
- **Tablero**: la subtarea va en una fila justo debajo de su padre, con `↳` en el título y la padre en **Depende de**:
  `| 05.1 | ↳ [Casos de import](pending/05.1_casos_import.md) | 2 Motor | 05 | ⬜ Pendiente |`
- **Regla de cierre**: una tarea padre **no puede pasar a ✅** mientras tenga alguna subtarea sin ✅. Cuando se cierra la última hija, se vuelve a la padre, se marcan sus líneas `→ ver N.M`, se pasa su verificación completa y se cierra.
- **in_progress**: la padre y la subtarea activa pueden estar las dos en `in_progress/` (cuentan como una sola familia). Nunca dos familias distintas a la vez.
- **Rutas**: al mover un archivo de carpeta, actualiza también los enlaces que apuntan a él desde la padre o las hijas, no solo el tablero.

### Cuándo subdividir
Por defecto **no** se subdivide. Solo tiene sentido si la tarea es claramente muy compleja y se da **alguna** de estas situaciones:
- Hay **muchos casos o puntos a revisar**, cada uno con su propia verificación (p. ej. "probar import con 6 formatos distintos", "revisar los 8 errores que salieron en los tests").
- El trabajo pendiente es grande, **no se puede terminar en esta sesión** o depende de algo externo (decisión, otra tarea).
- La parte nueva tiene **su propio objetivo** y sus propios criterios de aceptación.

Si no hay duda de que es grande, no subdividas: añade líneas `- [ ]` en el paso que corresponda. Antes de crear subtareas por iniciativa propia, **propónselo al usuario** con la lista (número, título, por qué) y créalas solo si lo confirma. Si él mismo pide "subdivide", créalas directamente.

## Decidir el modo

Según `$ARGUMENTS` o lo que pida el usuario:

| Entrada | Modo |
|---|---|
| un número (`09`, `9`, "la tarea 9") | **Ejecutar** esa tarea (y sus subtareas pendientes, en orden) |
| un número con punto (`5.1`, `05.1`) | **Ejecutar** solo esa subtarea |
| `siguiente`, "sigue", "la próxima" | **Ejecutar** la siguiente disponible (ver abajo) |
| `estado`, "cómo va", "tablero" | **Estado** |
| `subdividir N`, "divide la 5", "esto tiene cosas pendientes" | **Subdividir** la tarea N (solo si ya está en curso; ver Subtareas) |
| `planificar ...`, "divide esto en tareas", no existe `plans/tasks/` | **Planificar** |

Si ya hay una tarea en `in_progress/` y el usuario pide otra que no es de la misma familia, avisa y pregunta si se retoma la que está a medias o se cambia. No dejes dos familias en `in_progress/`.

---

## Modo Ejecutar

### 1. Preparar
1. Lee `plans/tasks/00_README.md`: fila de la tarea, columna **Depende de** y **Decisiones pendientes**.
2. Comprueba las dependencias: cada tarea de la que depende debe estar ✅ en `done/` (para una subtarea, su padre cuenta como dependencia satisfecha aunque esté 🔄). Si alguna no lo está, o una decisión abierta (D1, D2...) bloquea esta tarea, **para y díselo al usuario** con la decisión exacta que falta. No adivines decisiones del usuario.
3. Lee el archivo de la tarea completo y la sección del documento fuente que cita en **Doc:** (p. ej. `plans/about_this_project.md §4.1`). Lee también las bitácoras de las tareas de las que depende (y de la padre, si es subtarea): ahí están decisiones que afectan a esta.
4. Mueve el archivo a `in_progress/` (`git mv` si está versionado), pon `**Estado:** 🔄 En progreso` y actualiza enlace y estado en el tablero (y en la padre, si es subtarea).

### 2. Trabajar paso a paso
- Sigue los `### Paso N` en orden. Al terminar cada línea de un paso, márcala `- [ ]` → `- [x]` **en ese momento**, no todo al final. Así, si la sesión se corta, el archivo dice exactamente dónde se quedó.
- Si un paso resulta innecesario, incorrecto o imposible: no lo marques como hecho. Déjalo sin marcar o tachado (`- [ ] ~~texto~~`) y explica el motivo en la Bitácora.
- Si aparece trabajo nuevo que no estaba previsto, añádelo como línea `- [ ]` dentro del paso que corresponda (o como paso nuevo) antes de hacerlo. Solo si la tarea se vuelve muy compleja, propón **subdividirla** en `N.M` (ver Subtareas).
- Si la tarea tiene subtareas pendientes, trabájalas en orden (`N.1`, `N.2`...) aplicando este mismo flujo a cada una, y vuelve a la padre al final.
- Respeta las convenciones del proyecto (CLAUDE.md, lint, formato, tests).

### 3. Bitácora
Cada decisión no obvia, problema encontrado, desviación del plan o forma en que se verificó algo va a **Bitácora** con fecha absoluta:

```
- AAAA-MM-DD — Qué se decidió o qué pasó, y por qué.
```

Escribe para quien retome el proyecto dentro de meses: el porqué, no un resumen del diff. Sustituye el placeholder `_(fecha — nota)_` por la primera entrada real. Al crear subtareas, anota en la bitácora de la padre por qué se subdividió.

### 4. Verificación y criterios
- El paso final de cada tarea es **Verificación**: ejecuta de verdad lo que pide (tests, typecheck, lint, correr la app, probar el caso real). Si algo no se puede verificar en este entorno, dilo en la Bitácora con el motivo y qué se hizo en su lugar; no lo marques como verificado sin haberlo hecho.
- Recorre **Criterios de aceptación** uno a uno y marca solo los que se cumplen de forma comprobada.
- Si la verificación destapa fallos, corrígelos dentro de la tarea. Solo si son muchos y cada uno es un trabajo en sí, propón **subdividir** en vez de cerrar.

### 5. Cerrar
- **Subtarea**: al cerrarla, actualiza su línea en la sección `## Subtareas` de la padre (`- [x] ... — ✅ Terminada`) y la línea `→ ver N.M` del paso de origen.
- **Todos** los pasos, criterios y subtareas marcados (o justificados en Bitácora) → mueve el archivo a `done/`, `**Estado:** ✅ Terminada`, actualiza el tablero. Si queda un paso esperando una decisión, ciérrala igual pero indícalo en el tablero: `✅ Terminada (paso 6.4 espera D2)`.
- Si no se puede terminar → déjala en `in_progress/` (o `pending/` con ⛔ si queda bloqueada) y explica en la Bitácora qué falta.
- **Commit**: si el paso de verificación incluye una línea `Commit: ...`, haz ese commit con ese mensaje (incluyendo los cambios de `plans/tasks/`). Si la tarea marca **Cierre de Fase N**, la app debe arrancar con el comando de desarrollo del proyecto antes del commit.
- Termina con un resumen al usuario: qué se hizo, decisiones tomadas, subtareas creadas o cerradas, lo que quedó pendiente y cuál es la siguiente tarea disponible.

### Siguiente tarea disponible
1. Si hay algo en `in_progress/`, se sigue con esa familia: primero su subtarea pendiente de número más bajo; si no le quedan, la padre.
2. Si no, la tarea de **número más bajo** en `pending/` cuyas dependencias estén todas ✅ y que no esté bloqueada por una decisión abierta. Orden numérico real: `05` → `05.1` → `05.2` → `06` (no el orden alfabético de los archivos).

---

## Modo Estado

Lee el tablero y las carpetas y responde, sin modificar nada:
- Conteo: ✅ / 🔄 / ⬜ / ⛔.
- Tarea en curso y su progreso (pasos marcados / total), y el de sus subtareas (`05: 2/3 subtareas ✅`).
- Siguiente tarea disponible y las que están listas para empezar.
- Decisiones pendientes y qué tareas bloquean.
- **Incoherencias** entre carpeta, línea Estado, tablero y sección `## Subtareas` de la padre; subtareas huérfanas (sin padre) o padres ✅ con hijas sin cerrar. Ofrécete a corregirlas.

---

## Modo Planificar

Convierte un concepto, una spec o una funcionalidad en tareas.

1. **Entender**: lee el documento fuente (o pide al usuario que lo indique). Si hay ambigüedades que cambian el plan, conviértelas en **decisiones pendientes** `D1`, `D2`... con la pregunta concreta y qué tareas afectan, en vez de suponer la respuesta.
2. **Dividir en fases** (Base, Motor, UI, Datos, Build, Cierre...) y cada fase en tareas. Una tarea = una unidad que se puede terminar y verificar en una sesión y que deja el proyecto funcionando.
3. **Numerar** en orden de ejecución: `NN_nombre_en_snake_case.md`. Si una tarea se adelanta respecto a su fase lógica porque otras la necesitan, anótalo bajo el tablero con `*`.
4. **Detallar cada tarea** con [plantilla_task.md](plantilla_task.md):
   - **Objetivo** en 1–2 frases.
   - **Pasos** concretos y comprobables: rutas de archivo, nombres de funciones, canales, comandos. Nada de "implementar X" a secas.
   - Tests como paso propio cuando haya lógica pura (parsers, cálculos).
   - Último paso siempre **Verificación**: prueba manual real + tests + línea `Commit: tipo(scope): mensaje`. En la última tarea de una fase, añade `**Cierre de Fase N**`.
   - **Criterios de aceptación**: 2–4 resultados observables que demuestran que la tarea está bien hecha.
5. **Nunca crees subtareas en este modo.** Si al planificar una tarea salen demasiados pasos, redúcela a lo esencial o repártela en varias tareas numeradas independientes (`NN`, `NN+1`) en vez de anidar `N.M`; las subtareas solo aparecen después, durante la ejecución, si la realidad resulta más compleja de lo previsto.
6. **Tablero** con [plantilla_readme.md](plantilla_readme.md): tabla con enlace, fase, dependencias y estado. La sección sobre filas `↳` de subtareas se usa solo si en el futuro, al ejecutar, aparece alguna; no se preparan filas vacías de antemano.
7. Todas las tareas nuevas van a `pending/` con ⬜ (o ⛔ si una decisión las bloquea).
8. Para añadir tareas a un plan existente, usa el siguiente número libre y actualiza tablero y diagrama. No renumeres tareas ya creadas.

Al terminar, muestra al usuario el tablero y las decisiones pendientes para que las responda antes de empezar.

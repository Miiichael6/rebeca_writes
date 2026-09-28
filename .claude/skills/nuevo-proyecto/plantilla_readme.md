# Tareas — Nombre del proyecto

Documento fuente: [../about_this_project.md](../about_this_project.md) · Capturas: [../images/](../images/)

## Cómo se usa

- Cada archivo `NN_nombre.md` es una tarea. Se hacen **en orden numérico** salvo que las dependencias digan otra cosa.
- Cada tarea tiene un **Estado** general, un bloque **Usa / Produce** y una lista de **pasos** con casilla.
- Al marcar un paso: `- [ ]` → `- [x]`.
- Solo si una tarea resulta **muy compleja al ejecutarla** (no es lo habitual), se **subdivide** en `NN.1_nombre.md`, `NN.2_nombre.md`… Cada subtarea enlaza a su padre (`**Tarea padre:**`) y la padre las lista en `## Subtareas`. La padre no se cierra hasta que todas sus subtareas estén ✅. Nunca se crean subtareas al planificar.
- **Marcas `[[VERIFICAR: …]]`**: datos que no se conocían al planificar. Al empezar una tarea, se resuelven primero las suyas: se comprueba el dato real, se sustituye la marca y se anota en la Bitácora. Una tarea no se cierra con marcas abiertas.
- Al cerrar cada **fase**, la app debe arrancar con `comando dev` y se hace commit.
- En la **Bitácora** de cada archivo se anotan decisiones, problemas y la fecha de cierre.
- Cada archivo vive en la carpeta de su estado. Al moverlo, se actualizan su enlace y su estado en el **Tablero**:

  | Carpeta | Cuándo |
  |---|---|
  | [pending/](pending/) | Tarea no iniciada (⬜) o bloqueada (⛔) |
  | [in_progress/](in_progress/) | Al **empezar** a trabajarla (🔄). Solo una familia a la vez (padre + su subtarea activa) |
  | [done/](done/) | Al **terminarla** (✅), con todos sus pasos, criterios y subtareas cumplidos |

### Leyenda de estados

| Estado | Significado |
|---|---|
| ⬜ Pendiente | No iniciada |
| 🔄 En progreso | Se está trabajando |
| ✅ Terminada | Todos los pasos, criterios y subtareas cumplidos |
| ⛔ Bloqueada | Espera una decisión o a otra tarea |

## Decisiones pendientes (bloquean tareas)

- [ ] **D1** ¿Pregunta concreta? Opciones: A / B (recomendada: A, porque…) → afecta NN, NN

## Marcas por verificar

| Tarea | Marca |
|---|---|
| NN | `[[VERIFICAR: qué hay que comprobar]]` |

## Tablero

| # | Tarea | Fase | Depende de | Estado |
|---|---|---|---|---|
| 01 | [Título](pending/01_nombre.md) | 1 Base | — | ⬜ Pendiente |

Si una tarea se subdivide al ejecutarla, sus subtareas van en filas justo debajo de ella: `| 02.1 | ↳ [Título](pending/02.1_nombre.md) | 1 Base | 02 | ⬜ Pendiente |`

## Cobertura de la spec

| § | Sección | Tareas |
|---|---|---|
| 1 | Stack técnico | 01 |
| 2.1 | … | 03, 04 |
| 9 | Fuera de alcance | — (no se implementa en v1) |
| 10 | Criterios de aceptación | NN |

## Diagrama de dependencias

```
01 → 02 → 03
01 → 04 ─┬→ 06
01 → 05 ─┘
```

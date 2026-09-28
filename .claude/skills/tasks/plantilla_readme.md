# Tareas — Nombre del proyecto

Documento fuente: [../ruta_spec.md](../ruta_spec.md)

## Cómo se usa

- Cada archivo `NN_nombre.md` es una tarea. Se hacen **en orden numérico** salvo que las dependencias digan otra cosa.
- Cada tarea tiene un **Estado** general y una lista de **pasos** con casilla.
- Al marcar un paso: `- [ ]` → `- [x]`.
- Solo si una tarea es **muy compleja** (no es lo habitual), se **subdivide** en `NN.1_nombre.md`, `NN.2_nombre.md`... Cada subtarea enlaza a su padre (`**Tarea padre:**`) y la padre las lista en su sección `## Subtareas`. La padre no se cierra hasta que todas sus subtareas estén ✅.
- Al cerrar cada **fase**, la app debe arrancar y se hace commit.
- En la sección **Bitácora** de cada archivo se anotan decisiones, problemas y fecha de cierre.
- Cada archivo vive en la carpeta que corresponde a su estado, y al moverlo se actualiza su enlace y su estado en el **Tablero** (y en la padre, si es subtarea):

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

- [ ] **D1** ¿Pregunta concreta? → afecta NN, NN

## Tablero

| # | Tarea | Fase | Depende de | Estado |
|---|---|---|---|---|
| 01 | [Título](pending/01_nombre.md) | 1 Base | — | ⬜ Pendiente |

Si una tarea se subdivide, sus subtareas van en filas justo debajo de ella: `| 02.1 | ↳ [Título](pending/02.1_nombre.md) | 1 Base | 02 | ⬜ Pendiente |`

## Diagrama de dependencias

```
01 → 02 → 03
01 → 04 ─┬→ 06
01 → 05 ─┘
```

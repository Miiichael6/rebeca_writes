# 28 · Arquitectura hexagonal: lo que falta del proceso principal

**Estado:** 🔄 En progreso
**Fase:** 9 — Pulido · **Depende de:** ninguna · **Doc:** petición del usuario (2026-09-30)

## Objetivo
Terminar de llevar `src/main` a puertos y adaptadores. Ya está hecho el renderer, la persistencia (repositorios JSON) y los casos de uso `QueueService`, `HistoryService`, `TranscriptionManager` y `LiveSession`, que reciben sus dependencias como puertos (`application/ports/`). Falta que `ipc.ts` e `index.ts` los compongan en un solo sitio, migrar los `services/` que mezclan lógica con Electron/`fs`/procesos, y separar el pipeline del motor de los procesos hijos.

## Pasos
- [x] 1. `ipc.ts` como adaptador de entrada delgado (valida y delega) e `index.ts` como única raíz de composición: crea repositorios, casos de uso y adaptadores y los pasa; quitar los singletons globales (`history()`, `queue()`, `getSettings()`, `manager()`) y los wrappers de `services/queue.ts`, `services/history.ts` y `engine/transcribeManager.ts`
- [x] 2. Migrar `services/` restantes: `exporter`, `fileInput`, `ffmpeg`, `models`, `cudaPackage`, `updater`, `previews`, `mediaOpen`, `mediaRegistry`, `settings.ts`, `tempFiles` (reglas a `domain/` o `application/`, `electron`/`fs`/`child_process` a `infrastructure/`)
- [x] 3. Separar el pipeline de `engine/transcriptionEngine.ts` (fallback de backend, parseo de progreso, mapeo de errores) de los procesos (`spawn`, ffmpeg, `taskkill`)
- [ ] 4. Probar a mano en `npm run dev`: abrir archivo, cola (pausar/retomar/descartar), historial (renombrar, quitar, limpiar, reubicar), exportar, transcripción en vivo con el simulador de Listen
- [x] 5. `npm run typecheck`, lint y tests en verde; commit (`Commit: refactor(main): arquitectura hexagonal en main (tarea 28)`)

## Criterios de aceptación
- [x] Ningún caso de uso de `application/` importa `electron`, `fs` ni `child_process`
- [x] Las instancias se crean solo en la raíz de composición (`index.ts`)
- [ ] La app se comporta igual que antes (misma prueba manual del paso 4)

## Bitácora
- 2026-09-30 — Tarea creada a petición del usuario. Hecho antes de crearla (sin commitear aún): renderer completo, repositorios JSON de historial/cola/ajustes, y `QueueService`, `HistoryService`, `TranscriptionManager` y `LiveSession` en `application/`. Pendiente que el usuario pruebe esos cambios en `npm run dev`.
- 2026-09-30 — `index.ts` queda como única raíz de composición; la ventana pasó a `infrastructure/electron/mainWindow.ts` y el argv a `argvHandler.ts`. `engine/`, `live/` y `services/` ya no existen.
- 2026-09-30 — Verificado: typecheck, lint (0 errores) y tests en verde; `npm run dev` arranca sin errores (hubo que quitar `ELECTRON_RUN_AS_NODE` del shell). El recorrido manual del paso 4 (cola, historial, exportar, vivo) no se pudo hacer aquí: queda pendiente para el usuario, por eso la tarea sigue en curso.
- 2026-09-30 — Tras la revisión: `theme`/`logging` a `infrastructure/electron/`, `argvHandler` a `application/`; `LiveControl` atiende las órdenes en serie (un fin durante el arranque dejaba la sesión huérfana) y `electronUpdater` engancha oyentes tardíos.

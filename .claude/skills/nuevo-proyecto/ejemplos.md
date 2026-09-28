# Ejemplos de descomposición

Léelos antes de escribir el esquema. Cada ❌ incumple una condición concreta del criterio de atomicidad (indicada entre paréntesis).

## Tareas

❌ **05 Motor de transcripción** — lanzar el proceso, parsear la salida, reportar el progreso y cancelar
(mezcla varios objetivos independientes y no se verifica en una sola prueba)

✅ **05 Parser de segmentos** — `parseSegmentLine()` convierte `[hh:mm:ss.mmm --> …] texto` en `{start,end,text}`
✅ **06 Parser de progreso** — `parseProgress()` extrae `N%` de stderr
✅ **07 Ejecutar y cancelar** — `spawn` con streaming de 05/06 hacia el renderer, y `taskkill /T /F` al cancelar

---

❌ **03 Pantalla de historial** (depende de 08, persistencia)
(necesita algo que produce una tarea posterior: hay que reordenar o mover la persistencia antes)

---

❌ **01 Setup** con 11 pasos: repo, lint, format, tests, CI, i18n, tema oscuro, iconos…
(supera la guía de tamaño: i18n y tema tienen su propio objetivo → tareas aparte)

✅ **01 Setup** — repo, lint, format, test runner, la app arranca vacía. **Cierre**: `npm run dev` abre una ventana en blanco

## Líneas de paso

❌ `- [ ] Implementar el parser`
(sin sitio concreto)
✅ `- [ ] src/main/engine/parseSegments.ts → parseSegmentLine(line): Segment | null`

❌ `- [ ] Escribir parseProgress() y sus tests`
(dos objetivos en una línea)
✅ `- [ ] src/main/engine/parseProgress.ts → parseProgress(line): number | null`
✅ `- [ ] parseProgress.test.ts: "progress = 42%" → 42, línea vacía → null, "100%" → 100`

❌ `- [ ] Leer electron-builder.yml`  +  `- [ ] Añadir asarUnpack: resources/**`
(obtener el dato y usarlo es una sola acción con una herramienta)
✅ `- [ ] electron-builder.yml: añadir asarUnpack: resources/**`

❌ `- [ ] Hacer que el reproductor funcione`
(repite el Objetivo con otras palabras)

## Cuando no se sabe algo

❌ `- [ ] Lanzar whisper-cli con --print-progress`  ← flag inventado sin comprobar
✅ `- [ ] Lanzar whisper-cli con el flag de progreso [[VERIFICAR: nombre exacto del flag en whisper-cli --help de la versión descargada]]`

❌ Suponer "el instalador incluye CUDA" y planificarlo así
✅ **D2** ¿CUDA dentro del instalador (+~500 MB) o descargable desde la app? Opciones: incluido / descargable (recomendada: descargable, instalador ligero) → afecta 05, 22

## Esquema de ejemplo (paso 3, en el chat)

```
Fase 1 — Base
  01 Setup del proyecto — lint, format, vitest, la app arranca vacía · deps: — · §1
  02 Tipos y canales compartidos — src/shared con APP_NAME e IPC · deps: 01 · §7
  03 Layout estático — Sidebar, Toolbar, vista vacía · deps: 01 · §4.1 · Cierre Fase 1
Fase 2 — Motor
  04 Detección de backend — CUDA → Vulkan → CPU · deps: 02 · §2.1 · [D2]
  05 Parser de segmentos · deps: 02 · §2.3
  06 Parser de progreso · deps: 02 · §2.3
  07 Ejecutar y cancelar · deps: 04, 05, 06 · §2.3 · Cierre Fase 2
Decisiones: D2 ¿CUDA incluido o descargable? → 04, 22
Verificar: 07 flag de progreso de whisper-cli
```

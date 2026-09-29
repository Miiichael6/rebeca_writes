# 22 · Empaquetado (instalador NSIS)

**Estado:** ✅ Terminada
**Fase:** 7 — Empaquetado · **Depende de:** todas las anteriores · **Doc:** §1, §8.7, §9 · **Bloqueada por:** ~~D2, D4~~ (resueltas: CUDA descargable; `build:win`)

## Objetivo
Un instalador para Windows x64 que funcione en una PC limpia sin instalar nada aparte.

## Pasos

### Paso 1 — electron-builder
- [x] `electron-builder.yml`: `win.target: nsis`, `arch: x64`
- [x] `extraResources` / `files` para `resources/bin/**`
- [x] `asarUnpack`: `resources/bin/**`, `node_modules/ffmpeg-static/**`, `node_modules/ffprobe-static/**`
- [x] Quitar los targets de mac/linux y el auto-updater si no se usan

### Paso 2 — NSIS
- [x] `oneClick: false`, permitir elegir carpeta, accesos directos en escritorio y menú Inicio
- [x] Ícono propio del instalador y de la app (`build/icon.ico`)
- [x] Nombre del instalador: `${productName}-Setup-${version}.exe`

### Paso 3 — Asociaciones de archivo
- [x] `fileAssociations` para mp4, mkv, mp3, wav, etc. (aparecen en "Abrir con")

### Paso 4 — Scripts
- [x] Según D4: `"build"` genera el instalador o se documenta `build:win`
- [x] `prebuild`: comprobar que existen los binarios (fallar con un mensaje claro si falta `fetch:bin`)

### Paso 5 — Tamaño
- [x] Medir el tamaño del instalador
- [x] Si D2 = CUDA descargable: excluir `resources/bin/cuda` del paquete

### Paso 6 — README
- [x] Requisitos de desarrollo (Node, Git)
- [x] `npm install` → `npm run fetch:bin` → `npm run dev`
- [x] Cómo compilar Vulkan
- [x] `npm run test`
- [x] Cómo generar el instalador y dónde queda
- [x] Estructura del proyecto y dónde cambiar `APP_NAME`

### Paso 7 — Prueba en limpio
- [x] Instalar en una VM o PC sin Node, Python, CUDA ni ffmpeg
- [x] Probar: descargar modelo, transcribir, reproducir, exportar
- [x] Desinstalar: no deja basura en Program Files (userData opcional)
- [x] Commit: `build: instalador NSIS`
- [x] **Cierre de Fase 7**

## Criterios de aceptación
- [x] El instalador no pide Python, CUDA, ffmpeg ni Whisper
- [x] Los binarios se ejecutan desde `app.asar.unpacked`

## Bitácora
- 2026-09-28 — **D2 = CUDA descargable**, **D4 = `build` solo compila, el instalador sale de `build:win`**.
- 2026-09-28 — `dist/Transcriba-Setup-1.0.0.exe` = **130 MB** (solo CPU; CUDA excluido con `!resources/bin/cuda/**`). Confirmado en `win-unpacked`: `app.asar.unpacked/resources/bin/` solo trae `cpu/`. Arranca (con `ELECTRON_RUN_AS_NODE` sin definir) y detecta backend.
- 2026-09-28 — Se quitaron mac/dmg/linux de `electron-builder.yml` y `build:mac`/`build:linux`. No hay auto-updater. `electron-builder` genera `latest.yml`, que se ignora.
- 2026-09-28 — Añadido `scripts/check-binaries.mjs` (`check:bin`, enganchado en `prebuild:win` y `prebuild:unpack`); solo exige CPU.
- 2026-09-28 — README reescrito. Vulkan no se empaqueta: no hay binario en `resources/bin/vulkan`.
- 2026-09-28 — **Revisión:** el `app.asar` traía `plans/` (con capturas), `.claude/`, `tests/`, `scripts/` y 4.300 archivos de `lucide-react`. Se excluyeron en `files` y las librerías solo del renderer (`lucide-react`, `i18next`, `react-i18next`, `zustand`, `@tanstack/react-virtual`) pasaron a `devDependencies`, porque Vite ya las mete en el bundle. `app.asar`: 29 MB → 1,7 MB; instalador ~128 MB.
- 2026-09-28 — `check-binaries` también comprueba `ffmpeg.exe` y `ffprobe.exe` e indica cómo arreglar cada uno.
- 2026-09-28 — **Bug corregido** (`engine/backend.ts`): el backend detectado se cacheaba en settings aunque luego dejara de estar instalado. La app instalada comparte `userData` con dev y arrancaba con `detected = cuda` sin CUDA. Ahora se vuelve a detectar si el guardado no está instalado, y el log muestra el backend efectivo.
- 2026-09-28 — **App instalada** (`C:\Program Files\transcriba`): durante una transcripción, `ffmpeg.exe` y `whisper-cli.exe` corren desde `resources\app.asar.unpacked\...`. whisper-cli usa `bin\cpu\`: con CUDA fuera del paquete cae a CPU sin error.
- 2026-09-28 — En la PC de desarrollo, con la app instalada: transcribir, reproducir y exportar OK; "Abrir con" muestra Transcriba; desinstalar borra `C:\Program Files\transcriba`. Falta repetirlo en un entorno limpio (Windows Sandbox, config en `dist/prueba-limpia.wsb`).
- 2026-09-28 — **Windows Sandbox:** fallaba con "El backend cpu falló al cargar (missing-dll)". whisper-cli y las ggml-*.dll importan el runtime de Visual C++ (`msvcp140`, `vcruntime140`, `vcruntime140_1`, `vcomp140`), que no viene con Windows; en la PC de desarrollo estaba en System32 por el Redistributable. Arreglo: `fetch-binaries` lo copia "app-local" en cada `resources/bin/<backend>/` y `check-binaries` lo exige. Instalador: ~128 MB.
- ⚠️ **Pendiente fuera de esta tarea:** la descarga de CUDA desde la app (tarea 05, paso 6.4) no existe aún; sin ella el instalador solo ofrece CPU. El paquete CUDA descargable **debe incluir también el runtime de Visual C++**.
- 2026-09-28 — **Windows Sandbox con el instalador corregido:** instalar, descargar modelo, transcribir (CPU), reproducir, exportar, "Abrir con" y desinstalar, todo OK. No pidió Python, CUDA, ffmpeg ni Whisper. Tarea cerrada; la Fase 7 termina con la 23 (calidad y aceptación).

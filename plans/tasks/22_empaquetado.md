# 22 · Empaquetado (instalador NSIS)

**Estado:** ⬜ Pendiente
**Fase:** 7 — Empaquetado · **Depende de:** todas las anteriores · **Doc:** §1, §8.7, §9 · **Bloqueada por:** D2, D4

## Objetivo
Un instalador para Windows x64 que funcione en una PC limpia sin instalar nada aparte.

## Pasos

### Paso 1 — electron-builder
- [ ] `electron-builder.yml`: `win.target: nsis`, `arch: x64`
- [ ] `extraResources` / `files` para `resources/bin/**`
- [ ] `asarUnpack`: `resources/bin/**`, `node_modules/ffmpeg-static/**`, `node_modules/ffprobe-static/**`
- [ ] Quitar los targets de mac/linux y el auto-updater si no se usan

### Paso 2 — NSIS
- [ ] `oneClick: false`, permitir elegir carpeta, accesos directos en escritorio y menú Inicio
- [ ] Ícono propio del instalador y de la app (`build/icon.ico`)
- [ ] Nombre del instalador: `${productName}-Setup-${version}.exe`

### Paso 3 — Asociaciones de archivo
- [ ] `fileAssociations` para mp4, mkv, mp3, wav, etc. (aparecen en "Abrir con")

### Paso 4 — Scripts
- [ ] Según D4: `"build"` genera el instalador o se documenta `build:win`
- [ ] `prebuild`: comprobar que existen los binarios (fallar con un mensaje claro si falta `fetch:bin`)

### Paso 5 — Tamaño
- [ ] Medir el tamaño del instalador
- [ ] Si D2 = CUDA descargable: excluir `resources/bin/cuda` del paquete

### Paso 6 — README
- [ ] Requisitos de desarrollo (Node, Git)
- [ ] `npm install` → `npm run fetch:bin` → `npm run dev`
- [ ] Cómo compilar Vulkan
- [ ] `npm run test`
- [ ] Cómo generar el instalador y dónde queda
- [ ] Estructura del proyecto y dónde cambiar `APP_NAME`

### Paso 7 — Prueba en limpio
- [ ] Instalar en una VM o PC sin Node, Python, CUDA ni ffmpeg
- [ ] Probar: descargar modelo, transcribir, reproducir, exportar
- [ ] Desinstalar: no deja basura en Program Files (userData opcional)
- [ ] Commit: `build: instalador NSIS`
- [ ] **Cierre de Fase 7**

## Criterios de aceptación
- [ ] El instalador no pide Python, CUDA, ffmpeg ni Whisper
- [ ] Los binarios se ejecutan desde `app.asar.unpacked`

## Bitácora
- _(fecha — nota)_

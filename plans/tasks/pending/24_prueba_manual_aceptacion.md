# 24 · Prueba manual de aceptación y v1.0.0

**Estado:** ⬜ Pendiente
**Fase:** 7 — Cierre · **Depende de:** 23 · **Doc:** §6, §9

## Objetivo
Recorrer a mano, en la app instalada, todo lo que la 23 no pudo comprobar con tests ni revisando el código, y publicar la `v1.0.0`.

## Pasos

### Paso 0 — Preparación
- [ ] `npm run build:win`, desinstalar la versión anterior ("Transcriba") e instalar `RebeccaWrites-Setup-1.0.0.exe`
- [ ] Tener a mano: carpeta con ~50 videos de formatos mixtos, un audio de más de 3 h, un archivo sin pista de audio y un video con códec que Chromium no reproduce (HEVC)

### Paso 1 — Rendimiento (§6)
- [ ] La UI no se congela durante: transcripción, ffmpeg, vista previa, descarga de modelos, carpeta grande
- [ ] La transcripción de más de 3 h va fluida al desplazarse y buscar (lista virtualizada)

### Paso 2 — Atajos de teclado (el código ya se revisó en la 23)
- [ ] `Espacio` play/pausa
- [ ] `Ctrl+F` buscar
- [ ] `Ctrl+O` abrir
- [ ] `Ctrl+C` con foco en la transcripción copia todo
- [ ] `←/→` ±5 s
- [ ] `Ctrl+E` exportar
- [ ] Ninguno interfiere al escribir en un input (búsqueda, edición en línea, renombrar)

### Paso 3 — Accesibilidad
- [ ] Navegación completa con teclado (Tab por barra lateral, reproductor, transcripción, barra inferior, Configuración) con foco visible siempre

### Paso 4 — Criterios de aceptación §9
- [ ] Carpeta con 50 videos de formatos mixtos → se encolan y procesan solos
- [ ] Reproducir mientras se transcribe, ver el texto en vivo, clic para saltar
- [ ] CUDA automático con NVIDIA (tras la 23.1); Vulkan o CPU sin NVIDIA, sin instalar nada
- [ ] Búsqueda, copiar, unir líneas, desplazamiento automático
- [ ] Exportar en los 5 formatos y guardar .srt junto al video (abrirlo en VLC)
- [ ] Borrar historial pide confirmación y no toca los originales ni los .srt exportados
- [ ] Cerrar a mitad de la cola y reabrir permite retomar

### Paso 5 — Errores en vivo
- [ ] Archivo sin audio → mensaje traducido
- [ ] Transcribir sin modelo descargado → no deja empezar y lo explica

### Paso 6 — Cierre
- [ ] Anotar en la Bitácora lo que falle; si es un bug, arreglarlo aquí (o subdividir si son muchos)
- [ ] Marcar la 23 y la 24 como ✅ en `00_README.md` (todo ✅)
- [ ] Commit: `chore: v1.0.0`
- [ ] Tag `v1.0.0`

## Criterios de aceptación
- [ ] Todos los puntos de §9 marcados en la app instalada
- [ ] Tag `v1.0.0` creado sobre un árbol limpio con tests en verde

## Bitácora
- 2026-09-28 — Creada a partir de la 23: la parte manual (y el tag) se separó para cerrar la 23 con lo que se verifica automáticamente o revisando el código.

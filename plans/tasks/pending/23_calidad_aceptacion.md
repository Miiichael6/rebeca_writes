# 23 · Calidad y criterios de aceptación finales

**Estado:** ⬜ Pendiente
**Fase:** 7 — Cierre · **Depende de:** 22 · **Doc:** §6, §9

## Objetivo
Verificar todo el documento de requisitos contra la app instalada antes de darla por terminada.

## Pasos

### Paso 1 — Rendimiento (§6)
- [ ] La UI nunca se congela durante: transcripción, ffmpeg, vista previa, descarga de modelos, carpeta grande
- [ ] Transcripción de más de 3 h fluida (lista virtualizada)

### Paso 2 — Atajos de teclado
- [ ] `Espacio` play/pausa
- [ ] `Ctrl+F` buscar
- [ ] `Ctrl+O` abrir
- [ ] `Ctrl+C` con foco en la transcripción copia todo
- [ ] `←/→` ±5 s
- [ ] `Ctrl+E` exportar
- [ ] Ninguno interfiere al escribir en un input

### Paso 3 — Mensajes de error (en español y traducidos)
- [ ] Falta el modelo
- [ ] Falla el backend (con fallback aplicado)
- [ ] Archivo sin audio
- [ ] Sin espacio en disco

### Paso 4 — Accesibilidad
- [ ] Navegación completa con teclado y foco visible
- [ ] `aria-label` en todos los botones de ícono
- [ ] Contraste AA en claro y oscuro

### Paso 5 — Criterios de aceptación §9
- [ ] Carpeta con 50 videos de formatos mixtos → se encolan y procesan solos
- [ ] Reproducir mientras se transcribe, ver el texto en vivo, clic para saltar
- [ ] CUDA automático con NVIDIA; Vulkan o CPU sin NVIDIA, sin instalar nada
- [ ] El instalador no pide Python, CUDA, ffmpeg ni Whisper
- [ ] Búsqueda, copiar, unir líneas, desplazamiento automático
- [ ] Exportar en los 5 formatos y guardar .srt junto al video
- [ ] Borrar historial pide confirmación y no toca los originales
- [ ] Cerrar a mitad de la cola y reabrir permite retomar
- [ ] `npm run test` pasa
- [ ] El build genera el instalador

### Paso 6 — Revisión de marca
- [ ] Ningún nombre, logo ni texto de la app de referencia (buscar "WizWhisp", "NowSmart", "Pro")

### Paso 7 — Cierre
- [ ] Actualizar el tablero en `00_README.md` (todo ✅)
- [ ] Tag `v1.0.0`

## Criterios de aceptación
- [ ] Todos los puntos de §9 marcados

## Bitácora
- _(fecha — nota)_

# 06 · Descarga y gestión de modelos

**Estado:** ⬜ Pendiente
**Fase:** 2 — Motor · **Depende de:** 01 · **Doc:** §2.2 · **Capturas:** Screenshot_26 (sin "Pro" ni límite de 3 minutos)

## Objetivo
Descargar, reanudar, verificar, eliminar y añadir modelos GGML desde la app, sin límites.

## Pasos

### Paso 1 — Catálogo
- [ ] `src/shared/models.ts`: Tiny, Base, Small, Medium, Large v3 turbo, Large v3
- [ ] Por modelo: `id`, archivo, URL (`https://huggingface.co/ggerganov/whisper.cpp/resolve/main/<archivo>`), velocidad, precisión, memoria y tamaño en bytes esperado

### Paso 2 — Servicio de descarga
- [ ] `src/main/services/models.ts`
- [ ] Descargar a `userData/models/<archivo>.part` con `net.request` o `fetch` en main
- [ ] Seguir redirecciones (Hugging Face redirige a su CDN)
- [ ] Progreso: bytes, total, velocidad (media móvil), ETA; emitir como máximo cada 250 ms
- [ ] Cancelar (`AbortController`), conservando el `.part`

### Paso 3 — Reanudación
- [ ] Si existe `.part`, enviar `Range: bytes=<tamaño>-`
- [ ] Manejar `206` (continuar) y `200` (el servidor ignoró el Range, empezar de cero)
- [ ] Al terminar: verificar que el tamaño coincide y renombrar `.part` → `.bin`
- [ ] Si el tamaño no coincide: borrar y mostrar error

### Paso 4 — Eliminar y listar
- [ ] `list()`: estado (descargado / descargando / no), tamaño en disco
- [ ] `delete(id)`: confirmar que no esté en uso por una transcripción activa

### Paso 5 — Modelo personalizado
- [ ] Diálogo para elegir un `.bin` local + campo de nombre
- [ ] Validación básica (extensión y cabecera GGML)
- [ ] Guardar referencia en `userData/models/custom.json` (no copiar el archivo, o copiarlo opcionalmente)

### Paso 6 — IPC y UI
- [ ] Canales: `models:list`, `models:download`, `models:cancel`, `models:delete`, `models:addCustom`, evento `models:progress`
- [ ] Combo Modelo de la Toolbar: solo descargados + "Descargar más modelos..." → Configuración
- [ ] Error claro si no hay espacio en disco (comprobar antes con `fs.statfs`)

### Paso 7 — Verificación
- [ ] Descargar Tiny completo
- [ ] Cortar la red a mitad de Base y reanudar
- [ ] Commit: `feat(models): descarga con reanudación`

## Criterios de aceptación
- [ ] La reanudación continúa desde el byte correcto
- [ ] Ningún modelo tiene límite de duración ni candado

## Bitácora
- _(fecha — nota)_

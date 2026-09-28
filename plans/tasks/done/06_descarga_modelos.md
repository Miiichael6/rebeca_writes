# 06 · Descarga y gestión de modelos

**Estado:** ✅ Terminada
**Fase:** 2 — Motor · **Depende de:** 01 · **Doc:** §2.2 · **Capturas:** Screenshot_26 (sin "Pro" ni límite de 3 minutos)

## Objetivo
Descargar, reanudar, verificar, eliminar y añadir modelos GGML desde la app, sin límites.

## Pasos

### Paso 1 — Catálogo
- [x] `src/shared/models.ts`: Tiny, Base, Small, Medium, Large v3 turbo, Large v3
- [x] Por modelo: `id`, archivo, URL (`https://huggingface.co/ggerganov/whisper.cpp/resolve/main/<archivo>`), velocidad, precisión, memoria y tamaño en bytes esperado

### Paso 2 — Servicio de descarga
- [x] `src/main/services/models.ts`
- [x] Descargar a `userData/models/<archivo>.part` con `net.request` o `fetch` en main
- [x] Seguir redirecciones (Hugging Face redirige a su CDN)
- [x] Progreso: bytes, total, velocidad (media móvil), ETA; emitir como máximo cada 250 ms
- [x] Cancelar (`AbortController`), conservando el `.part`

### Paso 3 — Reanudación
- [x] Si existe `.part`, enviar `Range: bytes=<tamaño>-`
- [x] Manejar `206` (continuar) y `200` (el servidor ignoró el Range, empezar de cero)
- [x] Al terminar: verificar que el tamaño coincide y renombrar `.part` → `.bin`
- [x] Si el tamaño no coincide: borrar y mostrar error

### Paso 4 — Eliminar y listar
- [x] `list()`: estado (descargado / descargando / no), tamaño en disco
- [x] `delete(id)`: confirmar que no esté en uso por una transcripción activa

### Paso 5 — Modelo personalizado
- [x] Diálogo para elegir un `.bin` local + campo de nombre
- [x] Validación básica (extensión y cabecera GGML)
- [x] Guardar referencia en `userData/models/custom.json` (no copiar el archivo, o copiarlo opcionalmente)

### Paso 6 — IPC y UI
- [x] Canales: `models:list`, `models:download`, `models:cancel`, `models:delete`, `models:addCustom`, evento `models:progress` (+ `models:pickCustomFile` y evento `models:changed`)
- [x] Combo Modelo de la Toolbar: solo descargados + "Descargar más modelos..." → Configuración
- [x] Error claro si no hay espacio en disco (comprobar antes con `fs.statfs`)

### Paso 7 — Verificación
- [x] Descargar Tiny completo
- [x] Cortar la red a mitad de Base y reanudar
- [x] Commit: `feat(models): descarga con reanudación`

## Criterios de aceptación
- [x] La reanudación continúa desde el byte correcto
- [x] Ningún modelo tiene límite de duración ni candado

## Bitácora
- 2026-09-27 — **Catálogo** en `src/shared/models.ts` (`MODEL_CATALOG`, reemplaza a `WHISPER_MODELS` de `whisper.ts`). Tamaños exactos sacados de la cabecera `X-Linked-Size` de Hugging Face; `X-Linked-ETag` es el SHA-256 del archivo (no se verifica en la app, solo el tamaño, como pide el spec; se usó para comprobar las pruebas).
- 2026-09-27 — **Núcleo sin Electron** en `services/modelDownload.ts` (`downloadWithResume`, `SpeedMeter`, `freeDiskSpace`, `hasGgmlHeader`), con tests en `tests/main/modelDownload.test.ts` contra un servidor HTTP local con redirección 302: descarga, reanudación (206), Range ignorado (200 → de cero), `416` (borra el `.part` y reintenta sin Range), corte de red, cancelación, archivo más grande y error HTTP. `services/models.ts` lo envuelve con `net.fetch` (red de Chromium: respeta el proxy del sistema), rutas de `userData`, `custom.json` y eventos.
- 2026-09-27 — **Decisión sobre el tamaño:** si la conexión se corta y el `.part` queda **más corto**, se conserva y el error es `downloadFailed` (el botón pasa a "Reanudar"). Solo se borra si queda **más grande** de lo esperado (`sizeMismatch`). Borrar un `.part` corto por un corte de red haría inútil la reanudación.
- 2026-09-27 — Velocidad: media móvil de 5 s. Progreso como mucho cada 250 ms + uno final. Espacio en disco: `fs.statfs` antes de empezar, con los bytes que faltan + 100 MB de margen (`noDiskSpace`; también si falla la escritura con `ENOSPC`). No se probó en vivo con el disco lleno.
- 2026-09-27 — **En uso:** `acquireModel(id)` / `resolveModelPath(id)` quedan listos para la 08; `deleteModel` devuelve `modelInUse` mientras haya una transcripción que lo tenga adquirido. Si se borra un modelo que se está descargando, primero se cancela.
- 2026-09-27 — **Personalizados:** se guarda la referencia en `userData/models/custom.json` (id `custom:<uuid>`, nombre, ruta); **no se copia** el archivo. Validación: `.bin` + magic GGML `0x67676d6c` en little-endian. Quitarlo de la lista nunca borra el `.bin` del usuario. Si el archivo desaparece, sale como "Archivo no encontrado" y no aparece en el combo.
- 2026-09-27 — **UI:** Toolbar muestra solo modelos descargados + "Descargar más modelos..."; si el elegido no está descargado pasa al primero que sí, y sin ninguno muestra "Ningún modelo descargado". En Configuración hay una sección **Modelos › Modelos Whisper** funcional (descargar, barra con bytes/velocidad/ETA, cancelar, reanudar, eliminar con confirmación, agregar personalizado con diálogo). La 21 la ajusta a Screenshot_26. Errores traducidos en `errors.*` (es, en, pt-BR). Sin "Pro" ni límite de minutos.
- 2026-09-27 — **Verificación real:** con un script Electron temporal sobre `services/models.ts`: Tiny completo (4 s); Base cancelado a los 4 s (108 de 148 MB en `.part`) y reanudado hasta el final. En `npm run dev` (manejado por CDP): combo con Tiny/Base, descarga de Small desde Configuración (~20 MB/s con ETA), cancelada a 383 MB, "Reanudar" siguió desde ahí y terminó. **SHA-256 de tiny, base y small iguales a los de Hugging Face**, así que la reanudación continúa desde el byte correcto. Agregar personalizado: un archivo de texto da `invalidModel`; `ggml-tiny.bin` se añade y se quita sin tocar el archivo. El corte de red real se simuló con cancelación (en vivo) y con cierre de socket (en los tests).

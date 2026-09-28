# 09 · Protocolo media:// con soporte de Range

**Estado:** ✅ Terminada
**Fase:** 3 — Reproductor · **Depende de:** 03 · **Doc:** §4.1 Reproductor

## Objetivo
Servir archivos locales al `<video>` de forma segura y con posibilidad de adelantar el video.

## Pasos

### Paso 1 — Registro del esquema
- [x] `protocol.registerSchemesAsPrivileged([{ scheme: 'media', privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true } }])` **antes** de `app.whenReady`

### Paso 2 — Handler con Range
- [x] `protocol.handle('media', handler)` en `src/main/services/mediaProtocol.ts`
- [x] URL: `media://file/<id>` (por id, sin exponer rutas) — helper `mediaUrl(id)` en `src/shared/media.ts`
- [x] Sin cabecera Range → 200 con el archivo completo en stream
- [x] Con `Range: bytes=start-end` → 206, `Content-Range`, `Content-Length`, `Accept-Ranges: bytes`
- [x] `fs.createReadStream(path, { start, end })` convertido con `Readable.toWeb`
- [x] `Content-Type` por extensión
- [x] Range inválido → 416

### Paso 3 — Seguridad
- [x] Lista blanca: solo archivos del historial, de la cola o de la caché de vistas previas
- [x] Rechazar rutas con `..` o que no existan (404)

### Paso 4 — CSP
- [x] `media-src media: blob:` en `index.html`

### Paso 5 — Tests
- [x] Test unitario del parser de Range (`bytes=0-`, `bytes=100-200`, `bytes=-500`, inválidos)
- [x] Test del handler (200/206/416/404, lista blanca, archivo disperso de 1,5 GB)

### Paso 6 — Verificación
- [ ] Video de más de 1 GB: se reproduce al instante y se puede adelantar al final _(pendiente de la tarea 10: aún no hay `<video>`; ver Bitácora)_
- [x] Commit: `feat(player): protocolo media:// con Range`

## Criterios de aceptación
- [x] El seek funciona sin cargar el archivo completo
- [x] No se puede leer un archivo arbitrario del disco por `media://`

## Bitácora
- 2026-09-28 — La lista blanca es un registro en memoria del main (`src/main/services/mediaRegistry.ts`): `registerMedia(ruta) → id`, `resolveMedia(id)`, `unregisterMedia(id)`. Cola, historial y caché de vistas previas aún no existen (tareas 11, 17, 18); cuando lleguen, cada una registra sus archivos ahí. No hay canal IPC para registrar rutas desde el renderer a propósito: eso anularía la lista blanca. El renderer solo recibe ids y los convierte en URL con `mediaUrl(id)`.
- 2026-09-28 — El handler se separó en `mediaHandler.ts` (sin `electron`, `(Request) => Promise<Response>`) para poder probarlo con Vitest; `mediaProtocol.ts` solo hace `registerSchemesAsPrivileged` (a nivel de módulo en `index.ts`, antes de `whenReady`) y `protocol.handle`. Solo acepta host `file`; una ruta metida en la URL se trata como id y da 404.
- 2026-09-28 — Range: se soporta un único rango (`a-b`, `a-`, `-n`); varios rangos, otra unidad, rango fuera del archivo o archivo vacío → 416 con `Content-Range: bytes */size`. Un `end` más allá del archivo se recorta (RFC 9110). Chromium siempre pide un solo rango, así que no se implementa `multipart/byteranges`.
- 2026-09-28 — Verificación: typecheck, lint, `electron-vite build` y 118 tests en verde. El test del handler crea un archivo disperso de 1,5 GB y comprueba que `bytes=-4` y un rango de 1 KB a mitad devuelven 206 con solo esos bytes (el seek no lee el archivo entero). La app arranca con el esquema registrado (`electron-vite preview`). La reproducción real en `<video>` con un video de >1 GB **no se ha probado**: el Player todavía es un mock sin `<video>` (llega en la tarea 10). Esa línea del paso 6 queda sin marcar y se verifica en la 10.

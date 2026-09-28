# 09 · Protocolo media:// con soporte de Range

**Estado:** ⬜ Pendiente
**Fase:** 3 — Reproductor · **Depende de:** 03 · **Doc:** §4.1 Reproductor

## Objetivo
Servir archivos locales al `<video>` de forma segura y con posibilidad de adelantar el video.

## Pasos

### Paso 1 — Registro del esquema
- [ ] `protocol.registerSchemesAsPrivileged([{ scheme: 'media', privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true } }])` **antes** de `app.whenReady`

### Paso 2 — Handler con Range
- [ ] `protocol.handle('media', handler)` en `src/main/services/mediaProtocol.ts`
- [ ] URL: `media://file/<ruta codificada>` o `media://<id>` (preferible: por id para no exponer rutas)
- [ ] Sin cabecera Range → 200 con el archivo completo en stream
- [ ] Con `Range: bytes=start-end` → 206, `Content-Range`, `Content-Length`, `Accept-Ranges: bytes`
- [ ] `fs.createReadStream(path, { start, end })` convertido con `Readable.toWeb`
- [ ] `Content-Type` por extensión
- [ ] Range inválido → 416

### Paso 3 — Seguridad
- [ ] Lista blanca: solo archivos del historial, de la cola o de la caché de vistas previas
- [ ] Rechazar rutas con `..` o que no existan (404)

### Paso 4 — CSP
- [ ] `media-src media: blob:` en `index.html`

### Paso 5 — Tests
- [ ] Test unitario del parser de Range (`bytes=0-`, `bytes=100-200`, `bytes=-500`, inválidos)

### Paso 6 — Verificación
- [ ] Video de más de 1 GB: se reproduce al instante y se puede adelantar al final
- [ ] Commit: `feat(player): protocolo media:// con Range`

## Criterios de aceptación
- [ ] El seek funciona sin cargar el archivo completo
- [ ] No se puede leer un archivo arbitrario del disco por `media://`

## Bitácora
- _(fecha — nota)_

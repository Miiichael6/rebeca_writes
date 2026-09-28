import { randomUUID } from 'crypto'
import { isAbsolute, normalize, sep } from 'path'

/**
 * Lista blanca de lo que `media://` puede servir. Solo el proceso principal registra
 * rutas (cola, historial y caché de vistas previas, tareas 11/17/18); el renderer
 * recibe un id opaco y nunca una ruta, así que no puede pedir un archivo arbitrario.
 */
const pathsById = new Map<string, string>()
const idsByPath = new Map<string, string>()

/** Rutas absolutas y sin segmentos `..`; lo demás no entra en la lista blanca. */
export function isSafeMediaPath(filePath: string): boolean {
  if (!isAbsolute(filePath)) return false
  return !filePath.split(/[\\/]/).includes('..')
}

/** Clave de búsqueda: Windows no distingue mayúsculas en rutas. */
function pathKey(filePath: string): string {
  const normalized = normalize(filePath)
  return sep === '\\' ? normalized.toLowerCase() : normalized
}

/** Registra un archivo y devuelve su id. El mismo archivo conserva siempre el mismo id. */
export function registerMedia(filePath: string): string {
  if (!isSafeMediaPath(filePath)) throw new Error(`Ruta de medio no permitida: ${filePath}`)
  const key = pathKey(filePath)
  const existing = idsByPath.get(key)
  if (existing) return existing
  const id = randomUUID()
  pathsById.set(id, normalize(filePath))
  idsByPath.set(key, id)
  return id
}

/** Ruta registrada para `id`, o `null` si no está en la lista blanca. */
export function resolveMedia(id: string): string | null {
  return pathsById.get(id) ?? null
}

/** Saca un archivo de la lista blanca (p. ej. al borrarlo del historial). */
export function unregisterMedia(id: string): void {
  const filePath = pathsById.get(id)
  if (filePath === undefined) return
  pathsById.delete(id)
  idsByPath.delete(pathKey(filePath))
}

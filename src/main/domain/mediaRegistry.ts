import { randomUUID } from 'crypto'
import { isAbsolute, normalize, sep } from 'path'

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

/**
 * Lista blanca de lo que `media://` puede servir. Solo el proceso principal registra
 * rutas (cola, historial y caché de vistas previas, tareas 11/17/18); el renderer
 * recibe un id opaco y nunca una ruta, así que no puede pedir un archivo arbitrario.
 */
export class MediaRegistry {
  private readonly pathsById = new Map<string, string>()
  private readonly idsByPath = new Map<string, string>()

  /** Registra un archivo y devuelve su id. El mismo archivo conserva siempre el mismo id. */
  register(filePath: string): string {
    if (!isSafeMediaPath(filePath)) throw new Error(`Ruta de medio no permitida: ${filePath}`)
    const key = pathKey(filePath)
    const existing = this.idsByPath.get(key)
    if (existing) return existing
    const id = randomUUID()
    this.pathsById.set(id, normalize(filePath))
    this.idsByPath.set(key, id)
    return id
  }

  /** Ruta registrada para `id`, o `null` si no está en la lista blanca. */
  resolve(id: string): string | null {
    return this.pathsById.get(id) ?? null
  }

  /** Saca un archivo de la lista blanca (p. ej. al borrarlo del historial). */
  unregister(id: string): void {
    const filePath = this.pathsById.get(id)
    if (filePath === undefined) return
    this.pathsById.delete(id)
    this.idsByPath.delete(pathKey(filePath))
  }

  /** Como `unregister`, pero a partir de la ruta (para cuando no se guardó el id). */
  unregisterPath(filePath: string): void {
    const id = this.idsByPath.get(pathKey(filePath))
    if (id) this.unregister(id)
  }
}

import type { CacheFile } from '../../domain/previewPlan'

/**
 * Puerto de salida: la carpeta de la caché de vistas previas. Se trabaja con nombres de
 * archivo (ver `domain/previewPlan.ts`); `pathOf` da la ruta completa para ffmpeg y `media://`.
 */
export interface PreviewStore {
  /** Crea la carpeta y borra lo que dejó a medias un cierre anterior. */
  prepare(): Promise<void>
  /** Clave de caché de un medio original (cambia si el archivo cambia). */
  keyFor(input: string): Promise<string>
  pathOf(name: string): string
  /** Marca el archivo como usado ahora. `false` si no existe. */
  touch(name: string): Promise<boolean>
  /** Renombra la salida terminada a su nombre final. */
  commit(part: string, name: string): Promise<void>
  /** No falla si no existe. */
  remove(name: string): Promise<void>
  /** Archivos terminados, incluido el audio provisional (sin los `.part` en curso). */
  list(): Promise<CacheFile[]>
  /** Bytes de todo lo que hay, incluidos los `.part` en curso. */
  totalSize(): Promise<number>
  /** Vacía la carpeta. Nunca toca nada fuera de ella. */
  removeAll(): Promise<void>
}

/** Puerto de salida: el disco, para lo que los casos de uso necesitan saber o tocar. */
export interface Disk {
  exists(path: string): Promise<boolean>
  /** Tamaño en bytes; 0 si no existe. */
  fileSize(path: string): Promise<number>
  /** Bytes libres en el volumen de la carpeta. */
  freeSpace(dir: string): Promise<number>
  ensureDir(dir: string): Promise<void>
  /** Nombres de lo que hay en la carpeta; `[]` si no se puede leer. */
  listDir(dir: string): Promise<string[]>
  /** Borra el archivo, y si es una carpeta todo lo que tiene. No falla si no existe. */
  remove(path: string): Promise<void>
  /** Escribe UTF-8 sin BOM de forma atómica (archivo temporal + rename). */
  writeTextAtomic(path: string, text: string): Promise<void>
}

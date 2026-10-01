/** Un modelo `.bin` que el usuario añadió desde su disco. */
export interface CustomModel {
  id: string
  name: string
  /** Ruta del `.bin` elegido por el usuario; no se copia (spec §2.2). */
  path: string
  addedAt: number
}

/** Puerto de salida: dónde viven los modelos y la lista de los personalizados. */
export interface ModelStore {
  /** Carpeta de los modelos descargados (`userData/models`). */
  readonly dir: string
  readCustom(): Promise<CustomModel[]>
  writeCustom(models: CustomModel[]): Promise<void>
  /** ¿Es un archivo que empieza con la cabecera GGML? */
  isGgmlFile(path: string): Promise<boolean>
}

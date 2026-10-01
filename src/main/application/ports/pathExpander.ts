export interface ExpandedPaths {
  /** Archivos a encolar, sin repetidos, en el orden en que llegaron. */
  files: string[]
  /** Archivos de las carpetas que no tienen extensión de audio o video. */
  ignored: number
}

/** Puerto de salida: convierte archivos y carpetas soltados en la lista de archivos a encolar. */
export interface PathExpander {
  expand(paths: readonly string[]): Promise<ExpandedPaths>
}

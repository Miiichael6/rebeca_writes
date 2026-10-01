/** Puerto de salida: el Explorador de archivos del sistema. */
export interface Shell {
  showItemInFolder(path: string): void
}

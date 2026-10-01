/** Solo arrastres desde el Explorador; reordenar la cola también es un arrastre, sin archivos. */
export function hasFiles(e: DragEvent): boolean {
  return e.dataTransfer?.types.includes('Files') ?? false
}

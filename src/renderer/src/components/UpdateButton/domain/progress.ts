/** Porcentaje descargado, redondeado; 0 si aún no se conoce el tamaño total. */
export function downloadPercent(received: number, total: number): number {
  return total > 0 ? Math.round((received / total) * 100) : 0
}

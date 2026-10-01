/** Las últimas líneas de una salida de proceso, en una sola línea para el log. */
export function lastLines(text: string, count = 5): string {
  return text.trim().split(/\r?\n/).slice(-count).join(' | ')
}

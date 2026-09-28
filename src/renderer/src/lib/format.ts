const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

/** Tamaño en unidades binarias, como el Explorador de Windows: `74,1 MB`, `1,4 GB`. */
export function formatBytes(bytes: number, locale: string): string {
  let value = Math.max(0, bytes)
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value)
  return `${number} ${UNITS[unit]}`
}

/**
 * Navegación por teclado de un listbox: a qué opción lleva cada tecla y qué opción busca lo que
 * se acaba de escribir. Sin React ni DOM, para poder probarlo.
 */

/** Tiempo sin teclear tras el cual la búsqueda por escritura empieza de cero. */
export const TYPE_AHEAD_TIMEOUT = 700

export interface TypeAheadQuery {
  text: string
  /** Momento de la última tecla. */
  at: number
}

export const EMPTY_QUERY: TypeAheadQuery = { text: '', at: 0 }

/**
 * A qué índice mueve una tecla de navegación, o `null` si la tecla no navega. Las flechas se
 * quedan en los extremos (no dan la vuelta), como el desplegable nativo de Windows.
 */
export function moveIndex(key: string, current: number, count: number): number | null {
  if (count === 0) return null
  const last = count - 1
  const from = current < 0 ? -1 : current
  switch (key) {
    case 'ArrowDown':
      return Math.min(from + 1, last)
    case 'ArrowUp':
      return from < 0 ? last : Math.max(from - 1, 0)
    case 'Home':
      return 0
    case 'End':
      return last
    default:
      return null
  }
}

/** Acumula la tecla escrita en la búsqueda, o empieza una nueva si pasó demasiado tiempo. */
export function appendQuery(
  current: TypeAheadQuery,
  char: string,
  now: number,
  timeout = TYPE_AHEAD_TIMEOUT
): TypeAheadQuery {
  const open = now - current.at < timeout
  return { text: (open ? current.text : '') + char.toLowerCase(), at: now }
}

/** Una sola tecla repetida recorre las opciones que empiezan por ella, como el `<select>` nativo. */
function isRepeatedChar(text: string): boolean {
  return text.length > 1 && [...text].every((c) => c === text[0])
}

/**
 * Primera opción que empieza por lo escrito, buscando desde la siguiente a `from` y dando la
 * vuelta al llegar al final. Devuelve `null` si ninguna coincide.
 */
export function matchPrefix(labels: readonly string[], query: string, from: number): number | null {
  if (query === '') return null
  const prefix = isRepeatedChar(query) ? query[0] : query
  // Con una sola letra se avanza a la siguiente coincidencia; con varias se puede quedar donde está.
  const start = prefix.length === 1 ? from + 1 : from
  for (let step = 0; step < labels.length; step++) {
    const index = (start + step + labels.length) % labels.length
    if (labels[index].toLowerCase().startsWith(prefix)) return index
  }
  return null
}

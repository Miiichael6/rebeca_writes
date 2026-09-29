/**
 * Mezcla de una lista con la anterior para poder animar las bajas: los elementos que ya no
 * están se conservan un rato, en su sitio y marcados como salientes. Sin React ni
 * temporizadores; `useListExit` es quien decide cuándo soltarlos.
 */

export interface ExitingList<T> {
  /** Lo que hay que pintar: la lista nueva más los que aún están saliendo. */
  items: readonly T[]
  /** Claves de los elementos que ya no están en la lista real y se están yendo. */
  exiting: ReadonlySet<string>
}

const NONE: ReadonlySet<string> = new Set()

/** Lista sin nadie saliendo, para el estado inicial y para cuando termina la animación. */
export function settled<T>(items: readonly T[]): ExitingList<T> {
  return { items, exiting: NONE }
}

/**
 * `prev` es lo que se está pintando (puede incluir salientes de una baja anterior) y `next`
 * la lista real. Los que desaparecen vuelven a insertarse en la posición que ocupaban, así
 * la fila se encoge donde estaba en vez de saltar al final.
 */
export function mergeExiting<T>(
  prev: readonly T[],
  next: readonly T[],
  keyOf: (item: T) => string
): ExitingList<T> {
  const live = new Set(next.map(keyOf))
  const items = [...next]
  const exiting = new Set<string>()
  prev.forEach((item, index) => {
    const key = keyOf(item)
    if (live.has(key) || exiting.has(key)) return
    exiting.add(key)
    items.splice(Math.min(index, items.length), 0, item)
  })
  return exiting.size === 0 ? settled(next) : { items, exiting }
}

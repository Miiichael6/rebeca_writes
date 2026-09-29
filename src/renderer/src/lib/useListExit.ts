import { useEffect, useState } from 'react'
import { mergeExiting, settled, type ExitingList } from './listExit'
import { MOTION, motionDuration } from './motion'
import { useLatest } from './useLatest'

/**
 * Mantiene en la lista, durante la animación de salida, los elementos que ya se quitaron del
 * store. Devuelve qué pintar y qué claves están saliendo, para ponerles la clase que anima la
 * baja. Evita repartir `setTimeout` por los componentes de cola e historial.
 *
 * `keyOf` tiene que ser una función estable (declarada fuera del componente).
 */
export function useListExit<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  duration: number = MOTION
): ExitingList<T> {
  const [shown, setShown] = useState<ExitingList<T>>(() => settled(items))
  const [lastItems, setLastItems] = useState(items)
  const itemsRef = useLatest(items)

  // Ajuste durante el render (no en un efecto): así la lista nueva se pinta sin un fotograma
  // intermedio con los datos viejos.
  if (lastItems !== items) {
    setLastItems(items)
    setShown(mergeExiting(shown.items, items, keyOf))
  }

  // La espera solo se reinicia cuando cambia *qué* está saliendo, no cada vez que llega una
  // actualización de la lista (el progreso de un trabajo, por ejemplo).
  const exitingKeys = [...shown.exiting].sort().join('\n')

  useEffect(() => {
    if (exitingKeys === '') return
    const timer = setTimeout(() => setShown(settled(itemsRef.current)), motionDuration(duration))
    return () => clearTimeout(timer)
  }, [exitingKeys, duration, itemsRef])

  return shown
}

import { useEffect, useRef, type RefObject } from 'react'

/**
 * Guarda el último valor en una ref, actualizada después de cada render. Sirve para que un
 * efecto lea algo que cambia en cada render (una función, la fase actual) sin tener que
 * declararlo como dependencia y volver a ejecutarse por ello.
 *
 * La ref se escribe en un efecto, nunca durante el render: los efectos se ejecutan en el orden
 * en que se declaran, así que quien llame a `useLatest` antes de su propio efecto leerá ya el
 * valor de este render.
 */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  })
  return ref
}

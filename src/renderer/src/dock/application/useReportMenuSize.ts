import { useEffect } from 'react'

/** Hueco alrededor del menú para su sombra; el ancla del menú está a esta distancia del borde. */
export const MENU_WINDOW_PADDING_PX = 16

/**
 * Lo que ocupan el menú y su submenú abierto en la ventana. El menú está pegado arriba a la
 * derecha, así que lo que se sale por la izquierda (un submenú) cuenta como ancho de más.
 */
function measure(): { width: number; height: number } | null {
  const rects = [...document.querySelectorAll('.menu')].map((menu) => menu.getBoundingClientRect())
  if (rects.length === 0) return null
  const left = Math.min(...rects.map((rect) => rect.left))
  const bottom = Math.max(...rects.map((rect) => rect.bottom))
  return {
    width: window.innerWidth - left + MENU_WINDOW_PADDING_PX,
    height: bottom + MENU_WINDOW_PADDING_PX
  }
}

/**
 * Mientras `open`, le dice al main cuánto ocupa el menú para que ajuste la ventana (y la
 * muestre); vuelve a medir cuando se abre o se cierra el submenú.
 */
export function useReportMenuSize(open: boolean): void {
  useEffect(() => {
    if (!open) return
    let timer: ReturnType<typeof setTimeout> | undefined
    // Tras el render de React, con los popovers ya en su sitio.
    const report = (): void => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const size = measure()
        if (size) void window.api.dock.setMenuSize(size)
      })
    }
    report()
    const observer = new MutationObserver(report)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      clearTimeout(timer)
    }
  }, [open])
}

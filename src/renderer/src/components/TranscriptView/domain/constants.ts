/** Altura estimada de un segmento de una línea; la real se mide al pintarlo. */
export const ESTIMATED_ROW_PX = 26

/** Altura estimada de un párrafo de "Unir líneas" (unas cuatro líneas). */
export const ESTIMATED_PARAGRAPH_PX = 110

/** Espera tras la última tecla antes de buscar, para no recorrer miles de segmentos por letra. */
export const SEARCH_DEBOUNCE_MS = 150

/** Filas fuera de pantalla que mantiene el virtualizador, según el modo de la lista. */
export const OVERSCAN_SEGMENTS = 10
export const OVERSCAN_PARAGRAPHS = 3

/** Teclas con las que el usuario desplaza la lista a mano (pausan el autoscroll). */
export const SCROLL_KEYS: ReadonlySet<string> = new Set([
  'PageUp',
  'PageDown',
  'Home',
  'End',
  'ArrowUp',
  'ArrowDown'
])

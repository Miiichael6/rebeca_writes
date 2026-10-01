import type { DockMenuSize, DockView } from '@shared/dock'

/** Puerto de salida: la ventana del dock en el borde de la pantalla (tarea 30). */
export interface DockSurface {
  /** Crea la ventana, escondida en el borde. No hace nada si ya está abierta. */
  open(): void
  close(): void
  /** La desliza fuera o al borde según `view.out` y le pasa lo que debe mostrar. */
  show(view: DockView): void
  /** El ratón está sobre el dock fuera, según el sistema (no según la página). */
  cursorInside(): boolean
}

/** Puerto de salida: la ventana del menú contextual del dock. */
export interface DockMenuSurface {
  /** Crea la ventana escondida, para que el primer clic derecho no espere a que cargue. */
  prepare(): void
  /** Lo abre junto al cursor; se ve en cuanto el renderer dice cuánto ocupa. */
  open(): void
  /** Entre `open()` y `hide()`. */
  isOpen(): boolean
  /** Ajusta la ventana a lo que ocupa el menú (crece al abrir el submenú). */
  resize(size: DockMenuSize): void
  /** Lo esconde (queda cargado para la próxima vez). */
  hide(): void
  /** Lo destruye al salir de la app. */
  close(): void
}

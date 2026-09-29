/** Opción de un `Select`. En su propio archivo para que `Select` y `SelectList` la compartan. */
export interface SelectOption<T extends string> {
  value: T
  label: string
}

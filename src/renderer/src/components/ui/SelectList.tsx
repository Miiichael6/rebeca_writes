import { useEffect, useRef } from 'react'
import type { MountState } from '@renderer/lib/mountTransition'
import type { SelectOption } from './selectOption'

export interface SelectListProps<T extends string> {
  options: SelectOption<T>[]
  value: T
  /** Opción resaltada por teclado; es la que apunta `aria-activedescendant`. */
  active: number
  id: string
  'aria-label'?: string
  labelledBy?: string
  optionId: (index: number) => string
  onPick: (index: number) => void
  onHover: (index: number) => void
  state: MountState
  /** Se abre hacia arriba porque debajo del botón no hay espacio. */
  up?: boolean
  /** Se alinea al borde derecho del botón porque a la derecha no hay espacio. */
  end?: boolean
  maxHeight?: number
}

/** Lista flotante del `Select`. Solo pinta: el estado y el teclado los lleva `Select`. */
export function SelectList<T extends string>({
  options,
  value,
  active,
  id,
  labelledBy,
  optionId,
  onPick,
  onHover,
  state,
  up,
  end,
  maxHeight,
  ...rest
}: SelectListProps<T>): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (state === 'exiting') return
    const option = ref.current?.querySelector(`#${CSS.escape(optionId(active))}`)
    option?.scrollIntoView({ block: 'nearest' })
  }, [active, state, optionId])

  return (
    <div
      ref={ref}
      id={id}
      className={`select-list ${state}${up ? ' up' : ''}${end ? ' end' : ''}`}
      style={maxHeight ? { maxHeight } : undefined}
      role="listbox"
      aria-label={rest['aria-label']}
      aria-labelledby={labelledBy}
    >
      {options.map((option, index) => (
        <div
          key={option.value}
          id={optionId(index)}
          className={`select-option${index === active ? ' active' : ''}`}
          role="option"
          aria-selected={option.value === value}
          // `pointerdown` en vez de `click`: así el clic fuera no cierra la lista antes de elegir.
          onPointerDown={() => onPick(index)}
          onPointerEnter={() => onHover(index)}
        >
          {option.label}
        </div>
      ))}
    </div>
  )
}

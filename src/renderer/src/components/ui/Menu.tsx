import { Fragment, useEffect, useRef, type KeyboardEvent } from 'react'
import { MOTION_FAST } from '@renderer/lib/motion'
import { useMountTransition } from '@renderer/lib/useMountTransition'
import { useOutsidePointer } from '@renderer/lib/useOutsidePointer'

export interface MenuItem {
  label: string
  onSelect: () => void
  /** Dibuja una línea separadora encima del ítem. */
  separator?: boolean
  /** Opción elegida de un grupo (p. ej. la fuente de grabación). */
  checked?: boolean
}

export interface MenuProps {
  open: boolean
  onClose: () => void
  items: MenuItem[]
  /** Dónde se abre respecto al contenedor `.menu-anchor`. */
  placement?: 'top-end' | 'bottom-start' | 'bottom-end'
  'aria-label': string
}

/**
 * Menú desplegable (flyout de Windows 11). Va dentro de un `.menu-anchor` junto al botón que lo
 * abre. Se cierra con Esc, con un clic fuera o al elegir un ítem; ↑ ↓ mueven el foco. Al cerrarse
 * sigue montado hasta que acaba su animación de salida.
 */
export function Menu({
  open,
  onClose,
  items,
  placement = 'bottom-start',
  ...rest
}: MenuProps): React.JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null)
  const { mounted, state } = useMountTransition(open, MOTION_FAST)

  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [open])

  // Un clic en el botón que abre el menú lo gestiona el propio botón.
  useOutsidePointer(open, () => ref.current?.closest('.menu-anchor'), onClose)

  if (!mounted) return null

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    const buttons = [...(ref.current?.querySelectorAll('button') ?? [])]
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      ;(ref.current?.closest('.menu-anchor')?.querySelector('button') as HTMLElement)?.focus()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      buttons[(i + step + buttons.length) % buttons.length]?.focus()
    } else if (e.key === 'Tab') {
      onClose()
    }
  }

  return (
    <div
      ref={ref}
      className={`menu menu-${placement} ${state}`}
      role="menu"
      aria-label={rest['aria-label']}
      onKeyDown={onKeyDown}
    >
      {items.map((item) => (
        <Fragment key={item.label}>
          {item.separator && <div className="menu-separator" role="separator" />}
          <button
            type="button"
            role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
            aria-checked={item.checked}
            className={item.checked ? 'menu-item menu-item-checked' : 'menu-item'}
            onClick={() => {
              onClose()
              item.onSelect()
            }}
          >
            {item.label}
          </button>
        </Fragment>
      ))}
    </div>
  )
}

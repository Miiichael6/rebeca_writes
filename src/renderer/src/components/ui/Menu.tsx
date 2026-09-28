import { Fragment, useEffect, useRef, type KeyboardEvent } from 'react'

export interface MenuItem {
  label: string
  onSelect: () => void
  /** Dibuja una línea separadora encima del ítem. */
  separator?: boolean
}

export interface MenuProps {
  open: boolean
  onClose: () => void
  items: MenuItem[]
  /** Dónde se abre respecto al contenedor `.menu-anchor`. */
  placement?: 'top-end' | 'bottom-start'
  'aria-label': string
}

/**
 * Menú desplegable (flyout de Windows 11). Va dentro de un `.menu-anchor` junto al botón que lo
 * abre. Se cierra con Esc, con un clic fuera o al elegir un ítem; ↑ ↓ mueven el foco.
 */
export function Menu({
  open,
  onClose,
  items,
  placement = 'bottom-start',
  ...rest
}: MenuProps): React.JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const onPointerDown = (e: PointerEvent): void => {
      // Un clic en el botón que abre el menú lo gestiona el propio botón.
      const anchor = ref.current?.closest('.menu-anchor')
      if (!anchor?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, onClose])

  if (!open) return null

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
      className={`menu menu-${placement}`}
      role="menu"
      aria-label={rest['aria-label']}
      onKeyDown={onKeyDown}
    >
      {items.map((item) => (
        <Fragment key={item.label}>
          {item.separator && <div className="menu-separator" role="separator" />}
          <button
            type="button"
            role="menuitem"
            className="menu-item"
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

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject
} from 'react'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { MOTION_FAST } from '@renderer/lib/motion'
import { useMountTransition } from '@renderer/lib/useMountTransition'
import { useOutsidePointer } from '@renderer/lib/useOutsidePointer'

export interface MenuItem {
  /** Para lectores de pantalla y como clave; no se ve si hay `content`. */
  label: string
  /** Clave única si dos ítems pueden tener el mismo texto. */
  key?: string
  /** Sin efecto en un ítem con `submenu`. */
  onSelect?: () => void
  /** Elegirlo no cierra el menú (p. ej. opciones que se ven cambiar en el propio menú). */
  keepOpen?: boolean
  /** Dibuja una línea separadora encima del ítem. */
  separator?: boolean
  /** Título de grupo encima del ítem (tras el separador, si lo hay). */
  heading?: string
  /** Opción elegida de un grupo (p. ej. la fuente de grabación). */
  checked?: boolean
  /** Icono a la izquierda del texto. */
  icon?: LucideIcon
  /** Texto atenuado a la derecha (p. ej. lo elegido en el submenú). */
  hint?: string
  /** Fila informativa en vez de un botón (p. ej. un medidor); no se puede elegir con el teclado. */
  content?: React.ReactNode
  /** Ítems de un flyout lateral; se abre al pasar el puntero, con clic o con →. */
  submenu?: MenuItem[]
}

export interface MenuProps {
  open: boolean
  onClose: () => void
  items: MenuItem[]
  /** Dónde se abre respecto al contenedor `.menu-anchor`. */
  placement?: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'
  'aria-label': string
}

/**
 * Muestra el `popover` en cuanto se monta: así va en la capa superior y ningún contenedor con
 * `overflow: hidden` lo recorta. La posición la da el CSS (anchor positioning).
 */
function useShowPopover(ref: RefObject<HTMLElement | null>, mounted: boolean): void {
  useLayoutEffect(() => {
    const popover = ref.current
    if (mounted && popover && !popover.matches(':popover-open')) popover.showPopover()
  }, [ref, mounted])
}

const itemKey = (item: MenuItem): string => item.key ?? item.label
/** Cuánto sigue abierto un submenú cuando el puntero pasa a otro ítem. */
const SUBMENU_FOLD_MS = 300

/** Los botones de este nivel del menú, sin los de un submenú abierto. */
function levelButtons(menu: HTMLElement | null): HTMLButtonElement[] {
  const selector = ':scope > button, :scope > .menu-sub > button'
  return [...(menu?.querySelectorAll<HTMLButtonElement>(selector) ?? [])]
}

/** ↑ ↓ mueven el foco entre los botones de `menu`; devuelve si atendió la tecla. */
function moveFocus(e: KeyboardEvent, menu: HTMLElement | null): boolean {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return false
  e.preventDefault()
  const buttons = levelButtons(menu)
  const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const step = e.key === 'ArrowDown' ? 1 : -1
  buttons[(i + step + buttons.length) % buttons.length]?.focus()
  return true
}

/** `withIcons`: algún ítem del mismo nivel tiene icono; los que no, dejan el hueco para alinear. */
function ItemContent({
  item,
  withIcons
}: {
  item: MenuItem
  withIcons: boolean
}): React.JSX.Element {
  const Icon = item.icon
  return (
    <>
      {Icon ? (
        <Icon size={16} strokeWidth={1.5} className="menu-item-icon" aria-hidden="true" />
      ) : (
        withIcons && <span className="menu-item-icon" />
      )}
      <span className="menu-item-label">{item.label}</span>
      {item.hint && <span className="menu-item-hint">{item.hint}</span>}
    </>
  )
}

interface ItemsProps {
  items: MenuItem[]
  onClose: () => void
  /** Clave del submenú abierto; solo el primer nivel admite submenús. */
  openSub?: string | null
  setOpenSub?: (key: string | null) => void
  /** Como `setOpenSub`, pero al pasar el puntero: plegar espera un poco por si vuelve. */
  hoverSub?: (key: string | null) => void
}

function MenuItems({
  items,
  onClose,
  openSub,
  setOpenSub,
  hoverSub
}: ItemsProps): React.JSX.Element {
  const withIcons = items.some((item) => item.icon)
  return (
    <>
      {items.map((item) => (
        <Fragment key={itemKey(item)}>
          {item.separator && <div className="menu-separator" role="separator" />}
          {item.heading && <div className="menu-heading">{item.heading}</div>}
          {item.content ? (
            <div className="menu-content" aria-label={item.label}>
              {item.content}
            </div>
          ) : item.submenu && setOpenSub ? (
            <SubmenuItem
              item={item}
              submenu={item.submenu}
              open={openSub === itemKey(item)}
              setOpen={(open) => setOpenSub(open ? itemKey(item) : null)}
              onHover={() => hoverSub?.(itemKey(item))}
              onClose={onClose}
              withIcons={withIcons}
            />
          ) : (
            <button
              type="button"
              role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
              aria-checked={item.checked}
              className={item.checked ? 'menu-item menu-item-checked' : 'menu-item'}
              onMouseEnter={() => hoverSub?.(null)}
              onClick={() => {
                if (!item.keepOpen) onClose()
                item.onSelect?.()
              }}
            >
              <ItemContent item={item} withIcons={withIcons} />
            </button>
          )}
        </Fragment>
      ))}
    </>
  )
}

interface SubmenuItemProps {
  item: MenuItem
  submenu: MenuItem[]
  open: boolean
  setOpen: (open: boolean) => void
  onHover: () => void
  onClose: () => void
  withIcons: boolean
}

/**
 * Ítem que abre un flyout al lado. Con el teclado (→, Enter) el foco entra en la opción elegida;
 * ← o Esc dentro del flyout lo cierran y devuelven el foco al ítem.
 */
function SubmenuItem({
  item,
  submenu,
  open,
  setOpen,
  onHover,
  onClose,
  withIcons
}: SubmenuItemProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  // Abierto con el teclado: al montarse el flyout, el foco entra en él.
  const focusInside = useRef(false)
  useShowPopover(ref, open)

  useEffect(() => {
    if (!open || !focusInside.current) return
    focusInside.current = false
    const buttons = levelButtons(ref.current)
    ;(buttons.find((b) => b.getAttribute('aria-checked') === 'true') ?? buttons[0])?.focus()
  }, [open])

  const openWithFocus = (): void => {
    focusInside.current = true
    setOpen(true)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (moveFocus(e, ref.current)) {
      e.stopPropagation()
    } else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      trigger.current?.focus()
    }
  }

  return (
    <div className="menu-sub" onMouseEnter={onHover}>
      <button
        ref={trigger}
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        className="menu-item menu-item-sub"
        onClick={() => (open ? setOpen(false) : openWithFocus())}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowRight') return
          e.preventDefault()
          openWithFocus()
        }}
      >
        <ItemContent item={item} withIcons={withIcons} />
        <ChevronRight size={14} strokeWidth={1.5} className="menu-item-chevron" />
      </button>
      {open && (
        <div
          ref={ref}
          className="menu menu-submenu"
          popover="manual"
          role="menu"
          aria-label={item.label}
          onKeyDown={onKeyDown}
        >
          <MenuItems items={submenu} onClose={onClose} />
        </div>
      )}
    </div>
  )
}

/**
 * Menú desplegable (flyout de Windows 11). Va dentro de un `.menu-anchor` junto al botón que lo
 * abre. Se cierra con Esc, con un clic fuera o al elegir un ítem; ↑ ↓ mueven el foco. Un ítem
 * con `submenu` abre otro flyout al lado. Al cerrarse sigue montado hasta que acaba su animación
 * de salida.
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
  const [openSub, setOpenSub] = useState<string | null>(null)
  const foldTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useShowPopover(ref, mounted)
  // Al cerrarse, el submenú también; la próxima vez se abre plegado.
  if (!open && openSub !== null) setOpenSub(null)

  useEffect(() => {
    if (open) ref.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => clearTimeout(foldTimer.current)
  }, [open])

  const setSub = (key: string | null): void => {
    clearTimeout(foldTimer.current)
    setOpenSub(key)
  }
  // Pasar en diagonal hacia el flyout cruza otros ítems: plegarlo espera por si el puntero llega.
  const hoverSub = (key: string | null): void => {
    clearTimeout(foldTimer.current)
    if (key !== null) setOpenSub(key)
    else foldTimer.current = setTimeout(() => setOpenSub(null), SUBMENU_FOLD_MS)
  }

  // Un clic en el botón que abre el menú lo gestiona el propio botón.
  useOutsidePointer(open, () => ref.current?.closest('.menu-anchor'), onClose)

  if (!mounted) return null

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (moveFocus(e, ref.current)) return
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      ;(ref.current?.closest('.menu-anchor')?.querySelector('button') as HTMLElement)?.focus()
    } else if (e.key === 'Tab') {
      onClose()
    }
  }

  return (
    <div
      ref={ref}
      className={`menu menu-${placement} ${state}`}
      popover="manual"
      role="menu"
      aria-label={rest['aria-label']}
      onKeyDown={onKeyDown}
    >
      <MenuItems
        items={items}
        onClose={onClose}
        openSub={openSub}
        setOpenSub={setSub}
        hoverSub={hoverSub}
      />
    </div>
  )
}

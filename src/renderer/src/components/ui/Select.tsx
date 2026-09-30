import { ChevronDown } from 'lucide-react'
import { useCallback, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { appendQuery, EMPTY_QUERY, matchPrefix, moveIndex } from '@renderer/lib/listbox'
import { MOTION_FAST } from '@renderer/lib/motion'
import { useMountTransition } from '@renderer/lib/useMountTransition'
import { useOutsidePointer } from '@renderer/lib/useOutsidePointer'
import { SelectList } from './SelectList'
import type { SelectOption } from './selectOption'

export type { SelectOption } from './selectOption'

export interface SelectProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SelectOption<T>[]
  /** Si no hay `<label htmlFor>` asociada, `aria-label` da el nombre accesible. */
  'aria-label'?: string
  id?: string
  disabled?: boolean
  style?: CSSProperties
  /** `up` obliga a abrir hacia arriba; por defecto abre donde haya sitio. */
  direction?: 'auto' | 'up'
}

/** Alto aproximado de una opción, para saber si la lista cabe debajo del botón. */
const OPTION_HEIGHT = 32
const LIST_MAX_HEIGHT = 280
const LIST_GAP = 4
const VIEWPORT_MARGIN = 8

interface Placement {
  up: boolean
  maxHeight: number
}

/** Abre hacia abajo si cabe; si no, hacia el lado con más espacio, acortando la lista si hace falta. */
function placeList(anchor: HTMLElement, count: number, forceUp: boolean): Placement {
  const rect = anchor.getBoundingClientRect()
  const below = window.innerHeight - rect.bottom - LIST_GAP - VIEWPORT_MARGIN
  const above = rect.top - LIST_GAP - VIEWPORT_MARGIN
  const wanted = Math.min(LIST_MAX_HEIGHT, count * OPTION_HEIGHT + 8)
  const up = forceUp || (below < wanted && above > below)
  return {
    up,
    maxHeight: Math.max(OPTION_HEIGHT * 2, Math.min(LIST_MAX_HEIGHT, up ? above : below))
  }
}

/** Teclas que abren la lista desde el botón. */
const OPENING_KEYS = ['Enter', ' ', 'ArrowDown', 'ArrowUp', 'Home', 'End']

function isTypeAheadKey(e: KeyboardEvent): boolean {
  return e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.altKey && !e.metaKey
}

/**
 * Desplegable propio (botón + listbox flotante). Sustituye al `<select>` nativo, cuya lista pinta
 * Windows y no se puede ni tematizar ni animar. El foco se queda en el botón y la opción
 * resaltada se anuncia con `aria-activedescendant`, como el combobox de las APG.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  id,
  disabled,
  style,
  direction = 'auto',
  ...rest
}: SelectProps<T>): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [placement, setPlacement] = useState<Placement>({ up: false, maxHeight: LIST_MAX_HEIGHT })
  const anchorRef = useRef<HTMLDivElement>(null)
  const query = useRef(EMPTY_QUERY)
  const { mounted, state } = useMountTransition(open, MOTION_FAST)

  const uid = useId()
  const listId = `${uid}list`
  const optionId = useCallback((index: number) => `${listId}-${index}`, [listId])
  const selected = options.findIndex((o) => o.value === value)
  const current = options[selected]

  const close = (): void => setOpen(false)
  useOutsidePointer(open, () => anchorRef.current, close)

  const openList = (from: number = selected < 0 ? 0 : selected): void => {
    if (anchorRef.current) setPlacement(placeList(anchorRef.current, options.length, direction === 'up'))
    setActive(from)
    setOpen(true)
  }

  const pick = (index: number): void => {
    const option = options[index]
    if (option) onChange(option.value)
    close()
  }

  const search = (char: string): void => {
    query.current = appendQuery(query.current, char, Date.now())
    const labels = options.map((o) => o.label)
    const found = matchPrefix(labels, query.current.text, open ? active : selected)
    if (found === null) return
    if (open) setActive(found)
    else onChange(options[found].value)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>): void => {
    if (isTypeAheadKey(e)) {
      e.preventDefault()
      search(e.key)
      return
    }
    if (!open) {
      if (!OPENING_KEYS.includes(e.key)) return
      e.preventDefault()
      openList(moveIndex(e.key, selected, options.length) ?? undefined)
      return
    }
    const moved = moveIndex(e.key, active, options.length)
    if (moved !== null) {
      e.preventDefault()
      setActive(moved)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pick(active)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Tab') {
      close()
    }
  }

  return (
    <div className="field select" ref={anchorRef}>
      <button
        type="button"
        id={id}
        className="select-button"
        disabled={disabled}
        style={style}
        role="combobox"
        aria-label={rest['aria-label']}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? optionId(active) : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
      >
        {current?.label ?? ''}
      </button>
      <ChevronDown size={16} strokeWidth={1.5} aria-hidden />
      {mounted && (
        <SelectList
          options={options}
          value={value}
          active={active}
          id={listId}
          aria-label={rest['aria-label']}
          labelledBy={rest['aria-label'] ? undefined : id}
          optionId={optionId}
          onPick={pick}
          onHover={setActive}
          state={state}
          up={placement.up}
          maxHeight={placement.maxHeight}
        />
      )}
    </div>
  )
}

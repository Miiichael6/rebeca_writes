import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDown, ChevronUp, CircleAlert, FolderOpen, LocateFixed, Search } from 'lucide-react'
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { paragraphOf, toParagraphs } from '@shared/joinLines'
import type { Segment } from '@shared/types'
import { copyTranscript } from '@renderer/lib/copyTranscript'
import { editTranscriptSegment } from '@renderer/lib/editTranscript'
import {
  firstMatchAtOrAfter,
  updateSearch,
  type SearchMatch,
  type SearchResult
} from '@renderer/lib/search'
import { findActiveSegment } from '@renderer/lib/segments'
import { formatClock, formatTimestamp } from '@renderer/lib/time'
import {
  registerTranscriptScroller,
  scrollToSegment,
  type ScrollAlign
} from '@renderer/lib/transcriptScroll'
import { usePlayerStore } from '@renderer/store/player'
import { useSettingsStore } from '@renderer/store/settings'
import { toast } from '@renderer/store/toast'
import { canEdit, useTranscriptStore } from '@renderer/store/transcript'
import { Button, Menu, type MenuItem } from './ui'

/** Altura estimada de un segmento de una línea; la real se mide al pintarlo. */
const ESTIMATED_ROW_PX = 26

/** Altura estimada de un párrafo de "Unir líneas" (unas cuatro líneas). */
const ESTIMATED_PARAGRAPH_PX = 110

/** Espera tras la última tecla antes de buscar, para no recorrer miles de segmentos por letra. */
const SEARCH_DEBOUNCE_MS = 150

/** Barra fina bajo el encabezado mientras se transcribe el archivo abierto. */
function ProgressBar(): React.JSX.Element | null {
  const { t } = useTranslation()
  const job = useTranscriptStore((s) => (s.job?.entryId === s.entry?.id ? s.job : null))
  if (!job) return null
  const progress = Math.round(job.progress)
  return (
    <div className="transcript-progress">
      <span className="transcript-progress-phase">
        {job.phase === 'preparing'
          ? t('transcript.phasePreparing')
          : t('transcript.phaseTranscribing')}
      </span>
      <div
        className="transcript-progress-bar"
        role="progressbar"
        aria-label={t('transcript.progressLabel')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div style={{ width: `${progress}%` }} />
      </div>
      <span className="transcript-progress-text">
        {t('common.percent', { value: progress })}
        {job.etaSec !== null &&
          ` · ${t('transcript.remaining', { time: formatClock(job.etaSec) })}`}
      </span>
    </div>
  )
}

/** Aviso fijo cuando la última transcripción del archivo abierto falló. */
function ErrorBanner(): React.JSX.Element | null {
  const { t } = useTranslation()
  const status = useTranscriptStore((s) => s.status)
  const error = useTranscriptStore((s) => s.error)
  if (status !== 'error') return null
  return (
    <div className="transcript-error" role="alert">
      <CircleAlert size={16} strokeWidth={1.5} aria-hidden />
      <span>{error ? t(`errors.${error}`) : t('transcript.failed')}</span>
    </div>
  )
}

function EmptyState(): React.JSX.Element | null {
  const { t } = useTranslation()
  const status = useTranscriptStore((s) => s.status)
  switch (status) {
    case 'idle':
      return (
        <div className="empty">
          <FolderOpen size={32} strokeWidth={1.25} aria-hidden />
          <p>{t('transcript.emptyIdle')}</p>
        </div>
      )
    case 'ready':
      return (
        <div className="empty">
          <p>{t('transcript.emptyReady')}</p>
        </div>
      )
    case 'transcribing':
      return (
        <div className="empty">
          <p>{t('transcript.emptyWaiting')}</p>
        </div>
      )
    default:
      return null
  }
}

/** Acciones de la edición en línea. Estables entre renders para no romper el `memo` de las filas. */
interface EditHandlers {
  start: (index: number) => void
  change: (text: string) => void
  /** `refocus`: devolver el foco a la lista (Enter); no al salir con un clic fuera. */
  commit: (refocus: boolean) => void
  cancel: () => void
}

/**
 * Campo de edición de un segmento: se ajusta a la altura del texto. Enter guarda,
 * Shift+Enter hace salto de línea, Esc cancela y al perder el foco guarda.
 */
function SegmentEditor({ draft, edit }: { draft: string; edit: EditHandlers }): React.JSX.Element {
  const { t } = useTranslation()
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [draft])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus({ preventScroll: true })
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  // Los eventos no suben a la fila: su clic salta en el video y su Enter también.
  const stop = (e: React.SyntheticEvent): void => e.stopPropagation()
  return (
    <textarea
      ref={ref}
      className="segment-editor"
      rows={1}
      value={draft}
      aria-label={t('transcript.editLabel')}
      onChange={(e) => edit.change(e.target.value)}
      onBlur={() => edit.commit(false)}
      onClick={stop}
      onDoubleClick={stop}
      onContextMenu={stop}
      onKeyDown={(e) => {
        // Tampoco llegan a los atajos globales (Espacio, flechas, Ctrl+C...).
        e.stopPropagation()
        if (e.nativeEvent.isComposing) return
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          edit.commit(true)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          edit.cancel()
        }
      }}
    />
  )
}

/** Marca y tooltip de un segmento editado a mano. */
function editedProps(
  segment: Segment,
  t: (key: 'transcript.edited', options: { original: string }) => string
): { className?: string; title?: string } {
  return segment.edited
    ? {
        className: 'edited',
        title: t('transcript.edited', { original: segment.originalText ?? '' })
      }
    : {}
}

interface SegmentRowProps {
  segment: Segment
  index: number
  active: boolean
  start: number
  measure: (el: Element | null) => void
  onSeek: (t: number) => void
  /** Todas las coincidencias; las de este segmento son `matchCount` a partir de `firstMatch`. */
  matches: readonly SearchMatch[]
  firstMatch: number
  matchCount: number
  /** Índice global de la coincidencia actual si está en este segmento, si no -1. */
  currentMatch: number
  /** Borrador si este segmento se está editando, si no `null`. */
  draft: string | null
  edit: EditHandlers
}

/** Texto del segmento con sus coincidencias en `<mark>`; la actual lleva otro color. */
function highlight(
  text: string,
  matches: readonly SearchMatch[],
  first: number,
  count: number,
  current: number
): React.ReactNode {
  if (count === 0) return text
  const parts: React.ReactNode[] = []
  let pos = 0
  for (let i = first; i < first + count; i++) {
    const m = matches[i]
    if (m.start > pos) parts.push(text.slice(pos, m.start))
    parts.push(
      <mark key={i} className={i === current ? 'current' : undefined}>
        {text.slice(m.start, m.end)}
      </mark>
    )
    pos = m.end
  }
  if (pos < text.length) parts.push(text.slice(pos))
  return parts
}

/**
 * Un segmento de la lista virtualizada. Memorizado: al avanzar el video solo se vuelven a
 * pintar el que deja de estar activo y el nuevo.
 */
const SegmentRow = memo(function SegmentRow({
  segment,
  index,
  active,
  start,
  measure,
  onSeek,
  matches,
  firstMatch,
  matchCount,
  currentMatch,
  draft,
  edit
}: SegmentRowProps): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <p
      ref={measure}
      data-index={index}
      data-seg={index}
      className={`segment${active ? ' active' : ''}`}
      style={{ transform: `translateY(${start}px)` }}
      aria-current={active || undefined}
      role="button"
      tabIndex={0}
      onClick={() => onSeek(segment.start)}
      onKeyDown={(e) => {
        // Solo Enter: Espacio sigue siendo play/pausa (usePlayerShortcuts).
        if (e.key === 'Enter') onSeek(segment.start)
      }}
      onDoubleClick={() => edit.start(index)}
    >
      <time>[{formatTimestamp(segment.start)}]</time>
      {draft === null ? (
        <span {...editedProps(segment, t)}>
          {highlight(segment.text, matches, firstMatch, matchCount, currentMatch)}
        </span>
      ) : (
        <SegmentEditor draft={draft} edit={edit} />
      )}
    </p>
  )
})

interface ParagraphRowProps {
  segments: readonly Segment[]
  /** Segmentos del párrafo: `[from, to)`. */
  from: number
  to: number
  /** Índice de la fila (el párrafo), para `measureElement`. */
  index: number
  start: number
  measure: (el: Element | null) => void
  onSeek: (t: number) => void
  /** Segmento activo si está en este párrafo, si no -1. */
  activeSegment: number
  matches: readonly SearchMatch[]
  /** Índice global de la coincidencia actual si está en este párrafo, si no -1. */
  currentMatch: number
  /** Segmento que se está editando si está en este párrafo, si no -1. */
  editIndex: number
  draft: string | null
  edit: EditHandlers
}

/**
 * El párrafo no cambió si sus segmentos son los mismos objetos, aunque el array sea otro
 * (llegaron segmentos al final durante la transcripción).
 */
function sameParagraph(a: ParagraphRowProps, b: ParagraphRowProps): boolean {
  if (
    a.from !== b.from ||
    a.to !== b.to ||
    a.index !== b.index ||
    a.start !== b.start ||
    a.measure !== b.measure ||
    a.onSeek !== b.onSeek ||
    a.activeSegment !== b.activeSegment ||
    a.matches !== b.matches ||
    a.currentMatch !== b.currentMatch ||
    a.editIndex !== b.editIndex ||
    a.draft !== b.draft ||
    a.edit !== b.edit
  ) {
    return false
  }
  for (let i = a.from; i < a.to; i++) if (a.segments[i] !== b.segments[i]) return false
  return true
}

/**
 * Un párrafo de "Unir líneas": texto continuo sin marcas de tiempo, pero cada segmento es un
 * `<span>` propio para poder hacer clic en él y resaltar el activo y las coincidencias.
 */
const ParagraphRow = memo(function ParagraphRow({
  segments,
  from,
  to,
  index,
  start,
  measure,
  onSeek,
  activeSegment,
  matches,
  currentMatch,
  editIndex,
  draft,
  edit
}: ParagraphRowProps): React.JSX.Element {
  const { t } = useTranslation()
  const parts: React.ReactNode[] = []
  for (let i = from; i < to; i++) {
    const segment = segments[i]
    const first = firstMatchAtOrAfter(matches, i)
    const count = firstMatchAtOrAfter(matches, i + 1) - first
    if (i > from) parts.push(' ')
    if (i === editIndex && draft !== null) {
      parts.push(
        <span key={i} data-seg={i} className="editing">
          <SegmentEditor draft={draft} edit={edit} />
        </span>
      )
      continue
    }
    const edited = editedProps(segment, t)
    const classes = [i === activeSegment && 'active', edited.className].filter(Boolean)
    parts.push(
      <span
        key={i}
        data-seg={i}
        className={classes.length > 0 ? classes.join(' ') : undefined}
        title={edited.title}
        aria-current={i === activeSegment || undefined}
        onClick={() => onSeek(segment.start)}
        onDoubleClick={() => edit.start(i)}
      >
        {highlight(segment.text, matches, first, count, currentMatch)}
      </span>
    )
  }
  return (
    <p
      ref={measure}
      data-index={index}
      className="segment paragraph"
      style={{ transform: `translateY(${start}px)` }}
      tabIndex={0}
      onKeyDown={(e) => {
        // Enter salta al principio del párrafo; cada segmento se elige con el ratón.
        if (e.key === 'Enter') onSeek(segments[from].start)
      }}
    >
      {parts}
    </p>
  )
}, sameParagraph)

/** Teclas con las que el usuario desplaza la lista a mano (pausan el autoscroll). */
const SCROLL_KEYS = new Set(['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'])

/** Lleva `el` a la vista dentro de `container`, salvo que ya se vea entero. */
function scrollElementIntoView(container: HTMLElement, el: HTMLElement, align: ScrollAlign): void {
  const r = el.getBoundingClientRect()
  const c = container.getBoundingClientRect()
  if (r.top >= c.top && r.bottom <= c.bottom) return
  let delta: number
  if (align === 'center') delta = r.top + r.height / 2 - (c.top + c.height / 2)
  else if (align === 'start' || (align === 'auto' && r.top < c.top)) delta = r.top - c.top
  else delta = r.bottom - c.bottom
  container.scrollTop += delta
}

/**
 * Lista virtualizada (spec §7): solo están en el DOM los segmentos visibles y unos pocos
 * alrededor, así una transcripción de horas se desplaza igual de fluida que una corta.
 * Con "Unir líneas" cada fila es un párrafo; sin él, un segmento.
 */
interface SegmentListProps {
  segments: Segment[]
  matches: readonly SearchMatch[]
  currentMatch: number
}

function SegmentList({ segments, matches, currentMatch }: SegmentListProps): React.JSX.Element {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const joinLines = useSettingsStore((s) => s.settings.joinLines)
  const autoScroll = useSettingsStore((s) => s.settings.autoScroll)
  const playing = usePlayerStore((s) => s.playing)
  const transcribing = useTranscriptStore((s) => s.job !== null && s.job.entryId === s.entry?.id)
  // El selector devuelve un índice: la lista solo se vuelve a pintar al cambiar de segmento.
  const activeIndex = usePlayerStore((s) =>
    s.src ? findActiveSegment(segments, s.currentTime) : null
  )
  const playerSeek = usePlayerStore((s) => s.seek)

  const paragraphs = useMemo(
    () => (joinLines ? toParagraphs(segments) : null),
    [joinLines, segments]
  )
  const rowCount = paragraphs ? paragraphs.length : segments.length
  const rowOf = useCallback(
    (segment: number) => (paragraphs ? paragraphOf(paragraphs, segment) : segment),
    [paragraphs]
  )

  // El virtualizador es mutable a propósito; a las filas solo pasan números y `measureElement`,
  // que es estable.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (joinLines ? ESTIMATED_PARAGRAPH_PX : ESTIMATED_ROW_PX),
    overscan: joinLines ? 3 : 10,
    // Con la vista estable, `start` y `measure` no cambian entre renders y `memo` funciona.
    // El prefijo separa las medidas de párrafos y de segmentos al cambiar "Unir líneas".
    getItemKey: (index) => `${joinLines ? 'p' : 's'}${index}`
  })

  /** Primer segmento visible, para no perder el sitio al cambiar "Unir líneas". */
  const topSegmentRef = useRef(0)
  const onScroll = (): void => {
    const container = scrollRef.current
    if (!container) return
    const top = container.getBoundingClientRect().top
    for (const el of container.querySelectorAll<HTMLElement>('[data-seg]')) {
      if (el.getBoundingClientRect().bottom > top) {
        topSegmentRef.current = Number(el.dataset.seg)
        return
      }
    }
  }
  const prevJoinRef = useRef(joinLines)
  useLayoutEffect(() => {
    if (prevJoinRef.current === joinLines) return
    prevJoinRef.current = joinLines
    virtualizer.scrollToIndex(rowOf(topSegmentRef.current), { align: 'start' })
  }, [joinLines, rowOf, virtualizer])

  /** Lleva un segmento a la vista: si ya está en el DOM, con precisión dentro del párrafo. */
  const reveal = useCallback(
    (segment: number, align: ScrollAlign) => {
      const container = scrollRef.current
      if (!container) return
      const el = container.querySelector<HTMLElement>(`[data-seg="${segment}"]`)
      if (el) scrollElementIntoView(container, el, align)
      else virtualizer.scrollToIndex(rowOf(segment), { align, behavior: 'auto' })
    },
    [rowOf, virtualizer]
  )

  // Desplazamiento automático. `following` pasa a `false` cuando el usuario desplaza a mano
  // o navega la búsqueda, y vuelve con "Volver al actual", al hacer clic en un segmento o al
  // volver a activar la casilla.
  const [following, setFollowing] = useState(true)
  const [prevAutoScroll, setPrevAutoScroll] = useState(autoScroll)
  if (prevAutoScroll !== autoScroll) {
    setPrevAutoScroll(autoScroll)
    if (autoScroll) setFollowing(true)
  }
  const followPlayback = playing && activeIndex !== null
  const followLive = !playing && transcribing
  const pauseFollow = (): void => {
    if (autoScroll) setFollowing(false)
  }

  useEffect(() => {
    if (!autoScroll || !following) return
    if (followPlayback) reveal(activeIndex, 'center')
    else if (followLive && rowCount > 0) {
      virtualizer.scrollToIndex(rowCount - 1, { align: 'end', behavior: 'auto' })
    }
  }, [
    autoScroll,
    following,
    followPlayback,
    followLive,
    activeIndex,
    rowCount,
    segments,
    reveal,
    virtualizer
  ])

  useEffect(
    () =>
      registerTranscriptScroller((index, align) => {
        // La búsqueda manda: si no, el autoscroll se llevaría la vista de la coincidencia.
        setFollowing(false)
        reveal(index, align)
      }),
    [reveal]
  )

  const seek = useCallback(
    (time: number) => {
      setFollowing(true)
      playerSeek(time)
    },
    [playerSeek]
  )

  const showReturn = autoScroll && !following && (followPlayback || followLive)

  // Edición en línea (tarea 16). El borrador vive aquí y no en la fila: la fila puede salir
  // del DOM al desplazar (virtualización) sin perder lo escrito.
  const editable = useTranscriptStore(canEdit)
  const [editing, setEditing] = useState<{ index: number; draft: string } | null>(null)
  // Copia síncrona: Enter y el `blur` que le sigue no deben guardar dos veces.
  const editingRef = useRef(editing)
  const edit = useMemo<EditHandlers>(() => {
    const set = (next: { index: number; draft: string } | null): void => {
      editingRef.current = next
      setEditing(next)
    }
    return {
      start: (index) => {
        const state = useTranscriptStore.getState()
        const segment = state.segments[index]
        if (!segment) return
        if (!canEdit(state)) {
          toast(t('transcript.editLocked'))
          return
        }
        // Que el autoscroll no se lleve la vista mientras se escribe.
        setFollowing(false)
        set({ index, draft: segment.text })
      },
      change: (text) => {
        if (editingRef.current) set({ ...editingRef.current, draft: text })
      },
      commit: (refocus) => {
        const current = editingRef.current
        if (!current) return
        set(null)
        // Vacío cuenta como cancelar: un segmento no se borra editándolo.
        const text = current.draft.trim()
        if (text) editTranscriptSegment(current.index, text)
        if (refocus) scrollRef.current?.focus({ preventScroll: true })
      },
      cancel: () => {
        if (!editingRef.current) return
        set(null)
        scrollRef.current?.focus({ preventScroll: true })
      }
    }
  }, [t])
  // Si ese archivo empieza a transcribirse, el campo desaparece (no se puede editar).
  const activeEdit = editable ? editing : null

  const [menu, setMenu] = useState<{ index: number; x: number; y: number } | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  const menuSegment = menu ? segments[menu.index] : undefined
  const menuItems: MenuItem[] = []
  if (menu && menuSegment) {
    menuItems.push({ label: t('transcript.edit'), onSelect: () => edit.start(menu.index) })
    const original = menuSegment.originalText
    if (menuSegment.edited && original !== undefined) {
      menuItems.push({
        label: t('transcript.restoreOriginal'),
        onSelect: () => editTranscriptSegment(menu.index, original)
      })
    }
  }

  return (
    <div className="transcript-scroll">
      <div
        className="transcript-body"
        ref={scrollRef}
        tabIndex={-1}
        onScroll={onScroll}
        onWheel={pauseFollow}
        onTouchMove={pauseFollow}
        onPointerDown={(e) => {
          // Clic en el propio contenedor: la barra de desplazamiento.
          if (e.target === e.currentTarget) pauseFollow()
        }}
        onKeyDown={(e) => {
          if (SCROLL_KEYS.has(e.key) && !e.ctrlKey && !e.altKey) pauseFollow()
        }}
        onContextMenu={(e) => {
          const el = (e.target as HTMLElement).closest<HTMLElement>('[data-seg]')
          if (!el || !editable) return
          e.preventDefault()
          setMenu({ index: Number(el.dataset.seg), x: e.clientX, y: e.clientY })
        }}
      >
        <div
          className={`transcript-list${joinLines ? ' joined' : ''}`}
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((item) => {
            if (paragraphs) {
              const p = paragraphs[item.index]
              const first = firstMatchAtOrAfter(matches, p.from)
              const end = firstMatchAtOrAfter(matches, p.to)
              const editIndex =
                activeEdit && activeEdit.index >= p.from && activeEdit.index < p.to
                  ? activeEdit.index
                  : -1
              return (
                <ParagraphRow
                  key={item.key}
                  segments={segments}
                  from={p.from}
                  to={p.to}
                  index={item.index}
                  start={item.start}
                  measure={virtualizer.measureElement}
                  onSeek={seek}
                  activeSegment={
                    activeIndex !== null && activeIndex >= p.from && activeIndex < p.to
                      ? activeIndex
                      : -1
                  }
                  matches={matches}
                  currentMatch={currentMatch >= first && currentMatch < end ? currentMatch : -1}
                  editIndex={editIndex}
                  draft={editIndex === -1 ? null : activeEdit!.draft}
                  edit={edit}
                />
              )
            }
            // Coincidencias de la fila: solo se buscan para las que están en el DOM.
            const first = firstMatchAtOrAfter(matches, item.index)
            const end = firstMatchAtOrAfter(matches, item.index + 1)
            return (
              <SegmentRow
                key={item.key}
                segment={segments[item.index]}
                index={item.index}
                active={item.index === activeIndex}
                start={item.start}
                measure={virtualizer.measureElement}
                onSeek={seek}
                matches={matches}
                firstMatch={first}
                matchCount={end - first}
                // Solo la fila con la actual la recibe: así `memo` no repinta las demás al navegar.
                currentMatch={currentMatch >= first && currentMatch < end ? currentMatch : -1}
                draft={activeEdit?.index === item.index ? activeEdit.draft : null}
                edit={edit}
              />
            )
          })}
        </div>
      </div>
      {showReturn && (
        <Button
          className="transcript-return"
          size="sm"
          icon={<LocateFixed size={15} strokeWidth={1.5} />}
          onClick={() => setFollowing(true)}
        >
          {t('transcript.backToCurrent')}
        </Button>
      )}
      {menu && menuItems.length > 0 && (
        // Ancla de tamaño cero en el puntero; el menú se abre debajo y no se sale de la ventana.
        <div
          className="menu-anchor segment-menu"
          style={{
            left: Math.min(menu.x, window.innerWidth - 272),
            top: Math.min(menu.y, window.innerHeight - 100)
          }}
        >
          <Menu
            open
            onClose={closeMenu}
            items={menuItems}
            aria-label={t('transcript.segmentMenu')}
          />
        </div>
      )}
    </div>
  )
}

interface TranscriptSearch {
  query: string
  setQuery: (query: string) => void
  /** Busca ya lo escrito, sin esperar al debounce. Devuelve `false` si no hacía falta. */
  flush: () => boolean
  /** Consulta con la que se calcularon `matches`. */
  searched: string
  matches: readonly SearchMatch[]
  /** Índice de la coincidencia actual, o -1 si no hay. */
  current: number
  /** Coincidencia siguiente (+1) o anterior (-1), con vuelta al principio o al final. */
  step: (delta: 1 | -1) => void
}

/**
 * Estado de la búsqueda. Las coincidencias se recalculan al cambiar la consulta (con debounce)
 * o los segmentos; durante la transcripción solo se busca en los que llegan (`updateSearch`).
 */
function useTranscriptSearch(segments: Segment[]): TranscriptSearch {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState('')
  const [result, setResult] = useState<SearchResult>(() => updateSearch(null, segments, ''))
  const [current, setCurrent] = useState(-1)

  useEffect(() => {
    const id = setTimeout(() => setSearched(query), query.trim() ? SEARCH_DEBOUNCE_MS : 0)
    return () => clearTimeout(id)
  }, [query])

  // Estado derivado de props ajustado durante el render (patrón recomendado por React).
  if (result.segments !== segments || result.query !== searched) {
    const next = updateSearch(result, segments, searched)
    setResult(next)
    if (next.query !== result.query) {
      // Consulta nueva: a la primera coincidencia.
      setCurrent(next.matches.length ? 0 : -1)
    } else if (next.matches !== result.matches) {
      // Llegaron segmentos o cambió la lista: se conserva la actual si sigue existiendo.
      const last = next.matches.length - 1
      setCurrent((c) => (last < 0 ? -1 : Math.min(Math.max(c, 0), last)))
    }
  }

  const count = result.matches.length
  const step = useCallback(
    (delta: 1 | -1) => {
      if (count === 0) return
      setCurrent((c) => (c < 0 ? 0 : (c + delta + count) % count))
    },
    [count]
  )

  const flush = (): boolean => {
    if (query === searched) return false
    setSearched(query)
    return true
  }

  return { query, setQuery, flush, searched, matches: result.matches, current, step }
}

function TranscriptView(): React.JSX.Element {
  const { t } = useTranslation()
  const entry = useTranscriptStore((s) => s.entry)
  const segments = useTranscriptStore((s) => s.segments)
  const { query, setQuery, flush, searched, matches, current, step } = useTranscriptSearch(segments)
  const inputRef = useRef<HTMLInputElement>(null)
  /** Dónde estaba el foco antes de entrar al cuadro, para devolverlo con Esc. */
  const returnFocusRef = useRef<HTMLElement | null>(null)

  // Lleva la coincidencia actual a la vista. Depende del objeto: al llegar segmentos nuevos
  // las coincidencias viejas se conservan y la lista no salta.
  const currentMatch = matches[current] ?? null
  useEffect(() => {
    if (currentMatch) scrollToSegment(currentMatch.segmentIndex, 'center')
  }, [currentMatch])

  // Ctrl+F enfoca el cuadro desde cualquier parte de la vista principal.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!e.ctrlKey || e.altKey || e.shiftKey || e.metaKey || e.key.toLowerCase() !== 'f') return
      if (document.querySelector('dialog[open]')) return
      const input = inputRef.current
      if (!input || input.disabled) return
      e.preventDefault()
      input.focus()
      input.select()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    switch (e.key) {
      case 'Enter':
        // Si lo escrito aún no se buscó, Enter lo busca y se queda en la primera.
        if (!flush()) step(e.shiftKey ? -1 : 1)
        break
      case 'ArrowDown':
        if (!flush()) step(1)
        break
      case 'ArrowUp':
        if (!flush()) step(-1)
        break
      case 'Escape': {
        setQuery('')
        const back = returnFocusRef.current
        if (back?.isConnected) back.focus()
        else e.currentTarget.blur()
        break
      }
      default:
        return
    }
    e.preventDefault()
  }

  // Ctrl+C con el foco en la transcripción: sin selección copia todo (como se ve); con
  // selección se deja la copia nativa. En el cuadro de búsqueda copia lo de siempre.
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>): void => {
    if (!e.ctrlKey || e.altKey || e.shiftKey || e.metaKey || e.key.toLowerCase() !== 'c') return
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    if (window.getSelection()?.toString()) return
    e.preventDefault()
    void copyTranscript()
  }

  const hasResults = matches.length > 0

  return (
    <section className="transcript" aria-label={t('transcript.title')} onKeyDown={onKeyDown}>
      <div className="transcript-header">
        <h2 title={entry?.fileName}>
          {entry ? (entry.displayName ?? entry.fileName) : t('transcript.title')}
        </h2>
        {searched.trim() && (
          <span className="search-count" role="status">
            {hasResults
              ? t('transcript.searchCount', { current: current + 1, total: matches.length })
              : t('transcript.searchNoResults')}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          aria-label={t('transcript.previousResult')}
          title={t('transcript.previousResult')}
          icon={<ChevronUp size={18} strokeWidth={1.5} />}
          disabled={!hasResults}
          onClick={() => step(-1)}
        />
        <Button
          variant="ghost"
          size="sm"
          aria-label={t('transcript.nextResult')}
          title={t('transcript.nextResult')}
          icon={<ChevronDown size={18} strokeWidth={1.5} />}
          disabled={!hasResults}
          onClick={() => step(1)}
        />
        <div className="search">
          <input
            ref={inputRef}
            className="input"
            type="search"
            placeholder={t('transcript.searchPlaceholder')}
            aria-label={t('transcript.searchLabel')}
            value={query}
            disabled={segments.length === 0}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            onFocus={(e) => {
              returnFocusRef.current =
                e.relatedTarget instanceof HTMLElement ? e.relatedTarget : null
            }}
          />
          <Search size={14} strokeWidth={1.5} aria-hidden />
        </div>
      </div>

      <ProgressBar />
      <ErrorBanner />

      {segments.length === 0 ? (
        <div className="transcript-body">
          <EmptyState />
        </div>
      ) : (
        // `key`: al cambiar de archivo la lista empieza arriba y sin medidas viejas.
        <SegmentList key={entry?.id} segments={segments} matches={matches} currentMatch={current} />
      )}
    </section>
  )
}

export default TranscriptView

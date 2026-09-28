import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDown, ChevronUp, CircleAlert, FolderOpen, Search } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Segment } from '@shared/types'
import {
  firstMatchAtOrAfter,
  updateSearch,
  type SearchMatch,
  type SearchResult
} from '@renderer/lib/search'
import { findActiveSegment } from '@renderer/lib/segments'
import { formatClock, formatTimestamp } from '@renderer/lib/time'
import { registerTranscriptScroller, scrollToSegment } from '@renderer/lib/transcriptScroll'
import { usePlayerStore } from '@renderer/store/player'
import { useTranscriptStore } from '@renderer/store/transcript'
import { Button } from './ui'

/** Altura estimada de un segmento de una línea; la real se mide al pintarlo. */
const ESTIMATED_ROW_PX = 26

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
  currentMatch
}: SegmentRowProps): React.JSX.Element {
  return (
    <p
      ref={measure}
      data-index={index}
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
    >
      <time>[{formatTimestamp(segment.start)}]</time>
      <span>{highlight(segment.text, matches, firstMatch, matchCount, currentMatch)}</span>
    </p>
  )
})

/**
 * Lista virtualizada (spec §7): solo están en el DOM los segmentos visibles y unos pocos
 * alrededor, así una transcripción de horas se desplaza igual de fluida que una corta.
 */
interface SegmentListProps {
  segments: Segment[]
  matches: readonly SearchMatch[]
  currentMatch: number
}

function SegmentList({ segments, matches, currentMatch }: SegmentListProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  // El selector devuelve un índice: la lista solo se vuelve a pintar al cambiar de segmento.
  const activeIndex = usePlayerStore((s) =>
    s.src ? findActiveSegment(segments, s.currentTime) : null
  )
  const seek = usePlayerStore((s) => s.seek)

  // El virtualizador es mutable a propósito; a las filas solo pasan números y `measureElement`,
  // que es estable.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: segments.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_PX,
    overscan: 10,
    // Con la vista estable, `start` y `measure` no cambian entre renders y `memo` funciona.
    getItemKey: (index) => index
  })

  useEffect(
    () =>
      registerTranscriptScroller((index, align) =>
        virtualizer.scrollToIndex(index, { align, behavior: 'auto' })
      ),
    [virtualizer]
  )

  return (
    <div className="transcript-body" ref={scrollRef}>
      <div className="transcript-list" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
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
            />
          )
        })}
      </div>
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

  const hasResults = matches.length > 0

  return (
    <section className="transcript" aria-label={t('transcript.title')}>
      <div className="transcript-header">
        <h2 title={entry?.fileName}>{entry?.fileName ?? t('transcript.title')}</h2>
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

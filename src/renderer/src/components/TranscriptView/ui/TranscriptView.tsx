import { ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePorts } from '../application/ports'
import { useTranscriptSearch } from '../application/useTranscriptSearch'
import { useTranscriptShortcuts } from '../application/useTranscriptShortcuts'
import { Button } from '../../ui'
import { SegmentList } from './SegmentList'
import { EmptyState, ErrorBanner, ProgressBar } from './StatusPanels'

export function TranscriptView({ footer }: { footer?: React.ReactNode }): React.JSX.Element {
  const { t } = useTranslation()
  const { transcript, layout } = usePorts()
  const entry = transcript.useEntry()
  const segments = transcript.useSegments()
  const search = useTranscriptSearch(segments)
  const { query, setQuery, searched, matches, current, step } = search
  const { inputRef, onSectionKeyDown, onSearchKeyDown, onSearchFocus } =
    useTranscriptShortcuts(search)

  const hasResults = matches.length > 0

  // Con el video tapándola, la transcripción solo se ve como ventanita flotante.
  const covered = layout.useCovered()
  const floating = layout.useFloating()

  return (
    <section
      className={`transcript${covered ? ' covered' : ''}${floating ? ' floating' : ''}`}
      aria-label={t('transcript.title')}
      onKeyDown={onSectionKeyDown}
    >
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
            onFocus={onSearchFocus}
          />
          <Search size={14} strokeWidth={1.5} aria-hidden />
        </div>
        {floating && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('transcript.closeWindow')}
            title={t('transcript.closeWindow')}
            icon={<X size={18} strokeWidth={1.5} />}
            onClick={layout.closeFloatingWindow}
          />
        )}
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

      {/* Solo en la ventana flotante: la barra inferior de la app queda oculta bajo el video. */}
      {floating && footer}
    </section>
  )
}

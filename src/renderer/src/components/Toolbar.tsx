import { ScrollText, Settings, SquarePlay } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { whisperLanguageOptions } from '@renderer/lib/languages'
import { useHistoryStore } from '@renderer/store/history'
import { selectDownloaded, useModelsStore } from '@renderer/store/models'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { useTranscriptStore } from '@renderer/store/transcript'
import {
  cancelTranscription,
  startBlocker,
  startTranscription
} from '@renderer/store/transcription'
import { useUiStore } from '@renderer/store/ui'
import { Button, Checkbox, ConfirmDialog, Select, type SelectOption } from './ui'

/** Valor especial del combo de modelos: no es un modelo, abre Configuración. */
const MORE_MODELS = '__more__'

function Toolbar(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const uiLanguage = i18n.language
  const { model, language, translate } = useSettingsStore(
    useShallow((s) => ({
      model: s.settings.model,
      language: s.settings.language,
      translate: s.settings.translate
    }))
  )
  const videoVisible = useUiStore((s) => s.videoVisible)
  const covered = useUiStore((s) => s.transcriptCovered)
  const windowOpen = useUiStore((s) => s.transcriptWindowOpen)
  const { toggleVideo, toggleTranscriptWindow, setView } = useUiStore.getState()
  const status = useTranscriptStore((s) => s.status)
  const entryId = useTranscriptStore((s) => s.entry?.id)
  const runningEntryId = useTranscriptStore((s) => s.job?.entryId)
  const hasMedia = useHistoryStore((s) => (entryId ? s.media[entryId] != null : false))
  const blocker = startBlocker(entryId, hasMedia, runningEntryId)
  // El modelo y el idioma no cambian a mitad de la transcripción del archivo abierto.
  const locked = status === 'transcribing'
  // Volver a transcribir reemplaza los segmentos: si hay ediciones, se pide confirmación.
  const [confirmRestart, setConfirmRestart] = useState(false)
  const onTranscribe = (): void => {
    if (useTranscriptStore.getState().segments.some((s) => s.edited)) setConfirmRestart(true)
    else void startTranscription()
  }

  const downloaded = useModelsStore(useShallow(selectDownloaded))
  const loaded = useModelsStore((s) => s.models.length > 0)

  // Si el modelo elegido no está descargado (o se borró), pasa al primero que sí lo esté.
  useEffect(() => {
    if (loaded && downloaded.length > 0 && !downloaded.some((m) => m.id === model)) {
      updateSettings({ model: downloaded[0].id })
    }
  }, [loaded, downloaded, model])

  const hasModel = downloaded.some((m) => m.id === model)
  const modelOptions = useMemo(
    (): SelectOption<string>[] => [
      ...(hasModel ? [] : [{ value: '', label: t('toolbar.noModels') }]),
      ...downloaded.map((m) => ({ value: m.id, label: m.label })),
      { value: MORE_MODELS, label: t('toolbar.moreModels') }
    ],
    [downloaded, hasModel, t]
  )
  const languages = useMemo(
    () => whisperLanguageOptions(uiLanguage, t('toolbar.autoDetect')),
    [uiLanguage, t]
  )

  return (
    <header className="toolbar">
      <div className="toolbar-field">
        <label htmlFor="toolbar-model">{t('toolbar.model')}</label>
        <Select
          id="toolbar-model"
          value={hasModel ? model : ''}
          options={modelOptions}
          disabled={locked}
          onChange={(value) => {
            if (value === MORE_MODELS) setView('settings')
            else if (value) updateSettings({ model: value })
          }}
        />
      </div>
      <div className="toolbar-field">
        <label htmlFor="toolbar-language">{t('toolbar.language')}</label>
        <Select
          id="toolbar-language"
          value={language}
          options={languages}
          disabled={locked}
          onChange={(value) => updateSettings({ language: value })}
        />
      </div>
      <Checkbox
        className="toolbar-translate"
        checked={translate}
        disabled={locked}
        onChange={(value) => updateSettings({ translate: value })}
      >
        {t('toolbar.translate')}
      </Checkbox>

      <span className="spacer" />

      {covered && (
        <Button
          variant={windowOpen ? 'secondary' : 'ghost'}
          aria-label={windowOpen ? t('toolbar.hideTranscript') : t('toolbar.showTranscript')}
          title={windowOpen ? t('toolbar.hideTranscript') : t('toolbar.showTranscript')}
          aria-pressed={windowOpen}
          icon={<ScrollText size={16} strokeWidth={1.5} />}
          onClick={toggleTranscriptWindow}
        />
      )}
      <Button
        variant={videoVisible ? 'secondary' : 'ghost'}
        aria-label={videoVisible ? t('toolbar.hideVideo') : t('toolbar.showVideo')}
        aria-pressed={videoVisible}
        icon={<SquarePlay size={16} strokeWidth={1.5} />}
        onClick={toggleVideo}
      />
      <Button
        aria-label={t('toolbar.settings')}
        icon={<Settings size={16} strokeWidth={1.5} />}
        onClick={() => setView('settings')}
      />
      {status === 'transcribing' ? (
        <Button variant="primary" className="toolbar-action" onClick={cancelTranscription}>
          {t('common.cancel')}
        </Button>
      ) : (
        (status === 'ready' || status === 'error' || status === 'done') && (
          <Button
            variant="primary"
            className="toolbar-action"
            disabled={blocker !== null || !hasModel}
            title={
              blocker === 'noMedia'
                ? t('toolbar.transcribeNoMedia')
                : blocker === 'busy'
                  ? t('toolbar.transcribeBusy')
                  : undefined
            }
            onClick={onTranscribe}
          >
            {status === 'done' ? t('toolbar.retranscribe') : t('toolbar.transcribe')}
          </Button>
        )
      )}
      <ConfirmDialog
        open={confirmRestart}
        title={t('toolbar.retranscribeTitle')}
        confirmLabel={t('toolbar.retranscribe')}
        danger
        onConfirm={() => {
          setConfirmRestart(false)
          void startTranscription()
        }}
        onCancel={() => setConfirmRestart(false)}
      >
        {t('toolbar.retranscribeBody')}
      </ConfirmDialog>
    </header>
  )
}

export default Toolbar

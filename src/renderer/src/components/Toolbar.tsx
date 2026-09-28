import { Settings, SquarePlay } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { whisperLanguageOptions } from '@renderer/lib/languages'
import { selectDownloaded, useModelsStore } from '@renderer/store/models'
import { useTranscriptStore } from '@renderer/store/transcript'
import { useUiStore } from '@renderer/store/ui'
import { Button, Checkbox, Select, type SelectOption } from './ui'

/** Valor especial del combo de modelos: no es un modelo, abre Configuración. */
const MORE_MODELS = '__more__'

function Toolbar(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const uiLanguage = i18n.language
  const { model, language, translate, videoVisible } = useUiStore(
    useShallow((s) => ({
      model: s.model,
      language: s.language,
      translate: s.translate,
      videoVisible: s.videoVisible
    }))
  )
  const { setModel, setLanguage, setTranslate, toggleVideo, setView } = useUiStore.getState()
  const status = useTranscriptStore((s) => s.status)
  const { start, cancel } = useTranscriptStore.getState()

  const downloaded = useModelsStore(useShallow(selectDownloaded))
  const loaded = useModelsStore((s) => s.models.length > 0)

  // Si el modelo elegido no está descargado (o se borró), pasa al primero que sí lo esté.
  useEffect(() => {
    if (loaded && downloaded.length > 0 && !downloaded.some((m) => m.id === model)) {
      setModel(downloaded[0].id)
    }
  }, [loaded, downloaded, model, setModel])

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
          onChange={(value) => {
            if (value === MORE_MODELS) setView('settings')
            else if (value) setModel(value)
          }}
        />
      </div>
      <div className="toolbar-field">
        <label htmlFor="toolbar-language">{t('toolbar.language')}</label>
        <Select id="toolbar-language" value={language} options={languages} onChange={setLanguage} />
      </div>
      <Checkbox className="toolbar-translate" checked={translate} onChange={setTranslate}>
        {t('toolbar.translate')}
      </Checkbox>

      <span className="spacer" />

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
        <Button variant="primary" className="toolbar-action" onClick={cancel}>
          {t('common.cancel')}
        </Button>
      ) : (
        (status === 'ready' || status === 'error') && (
          <Button variant="primary" className="toolbar-action" onClick={start}>
            {t('toolbar.transcribe')}
          </Button>
        )
      )}
    </header>
  )
}

export default Toolbar

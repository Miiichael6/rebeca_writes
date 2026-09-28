import { Settings, SquarePlay } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { AUTO_LANGUAGE, WHISPER_LANGUAGES, WHISPER_MODELS, languageTag } from '@shared/whisper'
import { useTranscriptStore } from '@renderer/store/transcript'
import { useUiStore } from '@renderer/store/ui'
import { Button, Checkbox, Select, type SelectOption } from './ui'

/** Valor especial del combo de modelos: no es un modelo, abre Configuración. */
const MORE_MODELS = '__more__'

// Por ahora todos los modelos cuentan como descargados; la lista real sale de la tarea 06.
const modelOptions: SelectOption<string>[] = [
  ...WHISPER_MODELS.map((m) => ({ value: m.id, label: m.label })),
  { value: MORE_MODELS, label: 'Descargar más modelos...' }
]

/** Idiomas de whisper con el nombre en el idioma de la interfaz, ordenados alfabéticamente. */
function languageOptions(uiLocale: string): SelectOption<string>[] {
  const names = new Intl.DisplayNames([uiLocale], { type: 'language', fallback: 'code' })
  const collator = new Intl.Collator(uiLocale)
  const list = WHISPER_LANGUAGES.map((code) => {
    const name = names.of(languageTag(code)) ?? code
    return { value: code, label: name.charAt(0).toLocaleUpperCase(uiLocale) + name.slice(1) }
  }).sort((a, b) => collator.compare(a.label, b.label))
  return [{ value: AUTO_LANGUAGE, label: 'Detectar automáticamente' }, ...list]
}

// El idioma de la interfaz llega con i18n (tarea 04).
const languages = languageOptions('es')

function Toolbar(): React.JSX.Element {
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

  return (
    <header className="toolbar">
      <div className="toolbar-field">
        <label htmlFor="toolbar-model">Modelo Whisper:</label>
        <Select
          id="toolbar-model"
          value={model}
          options={modelOptions}
          onChange={(value) => (value === MORE_MODELS ? setView('settings') : setModel(value))}
        />
      </div>
      <div className="toolbar-field">
        <label htmlFor="toolbar-language">Idioma:</label>
        <Select id="toolbar-language" value={language} options={languages} onChange={setLanguage} />
      </div>
      <Checkbox className="toolbar-translate" checked={translate} onChange={setTranslate}>
        Traducir al inglés
      </Checkbox>

      <span className="spacer" />

      <Button
        variant={videoVisible ? 'secondary' : 'ghost'}
        aria-label={videoVisible ? 'Ocultar panel de video' : 'Mostrar panel de video'}
        aria-pressed={videoVisible}
        icon={<SquarePlay size={16} strokeWidth={1.5} />}
        onClick={toggleVideo}
      />
      <Button
        aria-label="Configuración"
        icon={<Settings size={16} strokeWidth={1.5} />}
        onClick={() => setView('settings')}
      />
      {status === 'transcribing' ? (
        <Button variant="primary" className="toolbar-action" onClick={cancel}>
          Cancelar
        </Button>
      ) : (
        (status === 'ready' || status === 'error') && (
          <Button variant="primary" className="toolbar-action" onClick={start}>
            Transcribir
          </Button>
        )
      )}
    </header>
  )
}

export default Toolbar

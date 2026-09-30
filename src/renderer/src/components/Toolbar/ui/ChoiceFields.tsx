import { useTranslation } from 'react-i18next'
import { usePorts } from '../application/ports'
import { useLanguageChoice, useModelChoice } from '../application/useTranscriptionChoice'
import { Checkbox, Select } from '../../ui'

/** Modelo, idioma y «traducir»: lo que se elige antes de transcribir. */
export function ChoiceFields({
  locked,
  model
}: {
  locked: boolean
  model: ReturnType<typeof useModelChoice>
}): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const { settings } = usePorts()
  const { translate } = settings.useChoice()
  const language = useLanguageChoice(i18n.language, t('toolbar.autoDetect'))

  return (
    <>
      <div className="toolbar-field">
        <label htmlFor="toolbar-model">{t('toolbar.model')}</label>
        <Select
          id="toolbar-model"
          value={model.value}
          options={model.options}
          disabled={locked}
          onChange={model.onChange}
        />
      </div>
      <div className="toolbar-field">
        <label htmlFor="toolbar-language">{t('toolbar.language')}</label>
        <Select
          id="toolbar-language"
          value={language.value}
          options={language.options}
          disabled={locked}
          onChange={language.onChange}
        />
      </div>
      <Checkbox
        className="toolbar-translate"
        checked={translate}
        disabled={locked}
        onChange={settings.setTranslate}
      >
        {t('toolbar.translate')}
      </Checkbox>
    </>
  )
}

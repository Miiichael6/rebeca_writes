import { Info, Pencil } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { usePromptModel } from '../application/usePromptModel'
import { SettingRow, TextArea, Toggle } from '../../../ui'

/** Prompt inicial: vocabulario y estilo que se le da a whisper antes de transcribir. */
export function PromptSetting(): React.JSX.Element {
  const { t } = useTranslation()
  const counterId = useId()
  const prompt = usePromptModel()

  return (
    <SettingRow
      icon={<Pencil size={20} strokeWidth={1.5} />}
      title={t('settings.prompt')}
      description={t('settings.promptDescription')}
      extra={
        <div className="prompt-editor">
          <TextArea
            aria-label={t('settings.prompt')}
            aria-describedby={counterId}
            value={prompt.prompt}
            placeholder={t('settings.promptPlaceholder')}
            rows={4}
            disabled={!prompt.enabled}
            onChange={(e) => prompt.setPrompt(e.target.value)}
          />
          <div
            id={counterId}
            className={prompt.tooLong ? 'prompt-tokens warning' : 'prompt-tokens'}
          >
            <Info size={14} strokeWidth={1.75} aria-hidden />
            {t('settings.promptTokens', { count: prompt.tokens })}
            {prompt.tooLong && ` · ${t('settings.promptTooLong')}`}
          </div>
        </div>
      }
    >
      <Toggle
        aria-label={t('settings.prompt')}
        checked={prompt.enabled}
        onChange={prompt.setEnabled}
      />
    </SettingRow>
  )
}

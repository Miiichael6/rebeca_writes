import { AudioLines, Filter, Info, Pencil, Rows3, Settings2 } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { defaultThreads } from '@shared/settings'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { NumberInput, SettingRow, TextArea, Toggle } from '../ui'

/** whisper.cpp solo usa los últimos `n_text_ctx / 2` = 224 tokens del prompt inicial. */
const PROMPT_MAX_TOKENS = 224

/** Aproximación de la tarea: ~4 caracteres por token. */
function approxTokens(text: string): number {
  return Math.ceil(text.trim().length / 4)
}

function PromptSetting(): React.JSX.Element {
  const { t } = useTranslation()
  const enabled = useSettingsStore((s) => s.settings.promptEnabled)
  const prompt = useSettingsStore((s) => s.settings.prompt)
  const counterId = useId()
  const tokens = approxTokens(prompt)
  const tooLong = tokens > PROMPT_MAX_TOKENS

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
            value={prompt}
            placeholder={t('settings.promptPlaceholder')}
            rows={4}
            disabled={!enabled}
            onChange={(e) => updateSettings({ prompt: e.target.value })}
          />
          <div id={counterId} className={tooLong ? 'prompt-tokens warning' : 'prompt-tokens'}>
            <Info size={14} strokeWidth={1.5} aria-hidden />
            {t('settings.promptTokens', { count: tokens })}
            {tooLong && ` · ${t('settings.promptTooLong')}`}
          </div>
        </div>
      }
    >
      <Toggle
        aria-label={t('settings.prompt')}
        checked={enabled}
        onChange={(promptEnabled) => updateSettings({ promptEnabled })}
      />
    </SettingRow>
  )
}

/** Modelos › Opciones de transcripción (Screenshot_27). Todo va a los argumentos de whisper-cli. */
function TranscriptionOptions(): React.JSX.Element {
  const { t } = useTranslation()
  const maxLen = useSettingsStore((s) => s.settings.maxLen)
  const suppressNst = useSettingsStore((s) => s.settings.suppressNst)
  const normalize = useSettingsStore((s) => s.settings.normalize)
  const threads = useSettingsStore((s) => s.settings.threads)
  // Igual que `os.availableParallelism()` en el main, que es con lo que valida.
  const cores = navigator.hardwareConcurrency || 1

  return (
    <>
      <PromptSetting />
      <SettingRow
        icon={<Rows3 size={20} strokeWidth={1.5} />}
        title={t('settings.maxLen')}
        description={t('settings.maxLenDescription')}
      >
        <NumberInput
          aria-label={t('settings.maxLen')}
          value={maxLen}
          min={0}
          max={10_000}
          onChange={(value) => updateSettings({ maxLen: value })}
        />
      </SettingRow>
      <SettingRow
        icon={<Filter size={20} strokeWidth={1.5} />}
        title={t('settings.suppressNst')}
        description={t('settings.suppressNstDescription')}
      >
        <Toggle
          aria-label={t('settings.suppressNst')}
          checked={suppressNst}
          onChange={(value) => updateSettings({ suppressNst: value })}
        />
      </SettingRow>
      <SettingRow
        icon={<AudioLines size={20} strokeWidth={1.5} />}
        title={t('settings.normalize')}
        description={t('settings.normalizeDescription')}
      >
        <Toggle
          aria-label={t('settings.normalize')}
          checked={normalize}
          onChange={(value) => updateSettings({ normalize: value })}
        />
      </SettingRow>
      <SettingRow
        icon={<Settings2 size={20} strokeWidth={1.5} />}
        title={t('settings.threads')}
        description={t('settings.threadsDescription', {
          default: defaultThreads(cores),
          total: cores
        })}
      >
        <NumberInput
          aria-label={t('settings.threads')}
          value={threads}
          min={1}
          max={cores}
          onChange={(value) => updateSettings({ threads: value })}
        />
      </SettingRow>
    </>
  )
}

export default TranscriptionOptions

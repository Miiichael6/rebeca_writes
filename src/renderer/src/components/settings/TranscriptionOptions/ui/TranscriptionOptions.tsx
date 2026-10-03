import { AudioLines, Filter, Rows3, Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { defaultThreads } from '@shared/settings'
import { usePorts } from '../application/ports'
import { MAX_LEN_MAX, MAX_LEN_MIN } from '../domain/options'
import { NumberInput, SettingRow, Toggle } from '../../../ui'
import { PromptSetting } from './PromptSetting'
import { VadSetting } from './VadSetting'

/** Modelos › opciones de transcripción: prompt, longitud, ruido, filtro de voz, normalizado e hilos. */
export function TranscriptionOptions(): React.JSX.Element {
  const { t } = useTranslation()
  const { options, hardware } = usePorts()
  const { maxLen, suppressNst, normalize, threads } = options.useValues()
  const cores = hardware.cores()

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
          min={MAX_LEN_MIN}
          max={MAX_LEN_MAX}
          onChange={(value) => options.update({ maxLen: value })}
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
          onChange={(value) => options.update({ suppressNst: value })}
        />
      </SettingRow>

      <VadSetting />

      <SettingRow
        icon={<AudioLines size={20} strokeWidth={1.5} />}
        title={t('settings.normalize')}
        description={t('settings.normalizeDescription')}
      >
        <Toggle
          aria-label={t('settings.normalize')}
          checked={normalize}
          onChange={(value) => options.update({ normalize: value })}
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
          onChange={(value) => options.update({ threads: value })}
        />
      </SettingRow>
    </>
  )
}

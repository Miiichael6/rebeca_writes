import { useTranslation } from 'react-i18next'
import { usePorts } from '../application/ports'
import { Checkbox } from '../../ui'

/** Opciones de la cola que se recuerdan entre sesiones. */
export function QueueOptions(): React.JSX.Element {
  const { t } = useTranslation()
  const { settings } = usePorts()
  const options = settings.useOptions()
  return (
    <div className="queue-options">
      <Checkbox
        checked={options.skipExistingSrt}
        onChange={(skipExistingSrt) => settings.setOptions({ skipExistingSrt })}
      >
        {t('queue.skipExistingSrt')}
      </Checkbox>
      <Checkbox
        checked={options.autoSaveSrt}
        onChange={(autoSaveSrt) => settings.setOptions({ autoSaveSrt })}
      >
        {t('queue.autoSaveSrt')}
      </Checkbox>
    </div>
  )
}

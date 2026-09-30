import { FileWarning } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePorts } from '../application/ports'
import { Button } from '../../ui'

/** Aviso cuando la entrada no tiene un archivo reproducible asociado (spec §5). */
export function Unavailable({ entryId }: { entryId: string }): React.JSX.Element {
  const { t } = useTranslation()
  const { library } = usePorts()
  return (
    <div className="player-unavailable" role="status">
      <FileWarning size={18} strokeWidth={1.5} aria-hidden />
      <span>{t('player.unavailable')}</span>
      <Button size="sm" onClick={() => void library.locateFile(entryId)}>
        {t('player.locateFile')}
      </Button>
    </div>
  )
}

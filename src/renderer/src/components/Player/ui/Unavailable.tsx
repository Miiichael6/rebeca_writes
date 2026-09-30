import { FileWarning, Mic } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePorts } from '../application/ports'
import { Button } from '../../ui'

interface UnavailableProps {
  entryId: string
  /** Rebecca Listen sigue grabando (tarea 27): el audio llega al terminar, no hay que buscarlo. */
  recording?: boolean
}

/** Aviso cuando la entrada no tiene un archivo reproducible asociado (spec §5). */
export function Unavailable({ entryId, recording = false }: UnavailableProps): React.JSX.Element {
  const { t } = useTranslation()
  const { library } = usePorts()
  if (recording) {
    return (
      <div className="player-unavailable" role="status">
        <Mic size={18} strokeWidth={1.5} aria-hidden />
        <span>{t('player.recording')}</span>
      </div>
    )
  }
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

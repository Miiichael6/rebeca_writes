import { ScrollText, Settings, SquarePlay } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePorts } from '../application/ports'
import { Button } from '../../ui'

/** Mostrar u ocultar la transcripción flotante y el video, y abrir Configuración. */
export function ViewButtons(): React.JSX.Element {
  const { t } = useTranslation()
  const { view } = usePorts()
  const videoVisible = view.useVideoVisible()
  const covered = view.useTranscriptCovered()
  const windowOpen = view.useTranscriptWindowOpen()

  return (
    <>
      {covered && (
        <Button
          variant={windowOpen ? 'secondary' : 'ghost'}
          aria-label={windowOpen ? t('toolbar.hideTranscript') : t('toolbar.showTranscript')}
          title={windowOpen ? t('toolbar.hideTranscript') : t('toolbar.showTranscript')}
          aria-pressed={windowOpen}
          icon={<ScrollText size={16} strokeWidth={1.5} />}
          onClick={view.toggleTranscriptWindow}
        />
      )}
      <Button
        variant={videoVisible ? 'secondary' : 'ghost'}
        aria-label={videoVisible ? t('toolbar.hideVideo') : t('toolbar.showVideo')}
        aria-pressed={videoVisible}
        icon={<SquarePlay size={16} strokeWidth={1.5} />}
        onClick={view.toggleVideo}
      />
      <Button
        aria-label={t('toolbar.settings')}
        icon={<Settings size={16} strokeWidth={1.5} />}
        onClick={view.openSettings}
      />
    </>
  )
}

import { useTranslation } from 'react-i18next'
import { useModelChoice } from '../application/useTranscriptionChoice'
import { useTranscribeAction } from '../application/useTranscribeAction'
import { ChoiceFields } from './ChoiceFields'
import { MicButton } from './MicButton'
import { TranscribeButton } from './TranscribeButton'
import { ViewButtons } from './ViewButtons'

/** Barra superior: qué y cómo transcribir, paneles visibles y el botón de transcribir. */
export function Toolbar(): React.JSX.Element {
  const { t } = useTranslation()
  const model = useModelChoice({
    noModels: t('toolbar.noModels'),
    moreModels: t('toolbar.moreModels')
  })
  const action = useTranscribeAction(model.available)

  return (
    <header className="toolbar">
      <ChoiceFields locked={action.locked} model={model} />
      <span className="spacer" />
      <MicButton />
      <ViewButtons />
      <TranscribeButton action={action} />
    </header>
  )
}

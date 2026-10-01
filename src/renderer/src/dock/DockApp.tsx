import { useTranslation } from 'react-i18next'
import { APP_NAME } from '@shared/app'
import {
  dockAlign,
  dockEdge,
  dockShowsIndicator,
  type DockAction,
  type DockButton
} from '@shared/dock'
import {
  EDGE_PILL_BARS,
  EdgePill,
  type EdgePillButton
} from '@renderer/components/EdgePill/EdgePill'
import { useWave } from '@renderer/components/MicButton/application/useWave'
import { meetingRecordingName, recordingName } from '@renderer/lib/recordingName'
import { onMicLevel } from '@renderer/store/mic'
import { useSettingsStore, useSettingsSync } from '@renderer/store/settings'
import { useThemeSync } from '@renderer/store/ui'
import { useDock } from './application/useDock'
import { useRecordingNameTemplates } from './application/useRecordingNameTemplates'
import { DOCK_ACTION_ICON_CLASS, DOCK_ACTIONS, RECORDING_INDICATOR } from './dockButtons'

/**
 * La ventana del dock en el borde (tarea 30): la `EdgePill` conectada al main. La ventana es
 * transparente, así que solo se ve la píldora. Clic derecho abre el menú del dock. `data-edge` y
 * `data-align` (tarea 33) dicen al CSS hacia qué borde va el margen y dónde va la barra.
 */
export function DockApp(): React.JSX.Element {
  useThemeSync()
  useSettingsSync()
  useRecordingNameTemplates()
  const { t } = useTranslation()
  const { view, press, hover, openMenu } = useDock()
  const source = useSettingsStore((s) => s.settings.recordingSource)
  const position = useSettingsStore((s) => s.settings.dockPosition)
  const wave = useWave(view.recording, onMicLevel, EDGE_PILL_BARS)

  const button = (side: DockButton, action: DockAction | null): EdgePillButton | null => {
    if (action) {
      const { icon, title } = DOCK_ACTIONS[action]
      const iconClass = DOCK_ACTION_ICON_CLASS[action]
      const name = (): string =>
        action === 'recordMeeting' ? meetingRecordingName() : recordingName(source)
      return { icon, iconClass, title: t(title), onClick: () => press(side, name()) }
    }
    if (side === 'right' && dockShowsIndicator(view))
      return { icon: RECORDING_INDICATOR.icon, title: t(RECORDING_INDICATOR.title) }
    return null
  }

  const question = view.question && t(`dock.questions.${view.question}`, { app: APP_NAME })
  const questionTitle =
    view.question && t(`dock.questionTitles.${view.question}`, { app: APP_NAME })

  return (
    <div
      className="dock"
      data-edge={dockEdge(position)}
      data-align={dockAlign(position)}
      onContextMenu={(e) => {
        e.preventDefault()
        openMenu()
      }}
    >
      <EdgePill
        collapsed={!view.out}
        active={view.recording}
        levels={view.recording ? wave : undefined}
        question={question}
        questionTitle={questionTitle ?? undefined}
        left={button('left', view.left)}
        right={button('right', view.right)}
        onHover={hover}
      />
    </div>
  )
}

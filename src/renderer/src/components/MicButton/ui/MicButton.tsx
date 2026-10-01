import { useState } from 'react'
import { ChevronDown, Mic, MicVocal, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RECORDING_SOURCES } from '@shared/recording'
import { useMicAction, type MicAction } from '../application/useMicAction'
import { Button, Menu, type MenuItem } from '../../ui'
import { MicLevelMeters } from './MicLevelMeters'
import { SOURCE_ICONS } from './sourceIcons'

/**
 * Arriba, los niveles del sistema y del micrófono; luego las fuentes y, si la elegida usa el
 * micrófono, el submenú Micrófono con el predeterminado y los conectados (el elegido se ve al
 * lado del ítem).
 */
function menuItems(
  action: MicAction,
  labels: { microphone: string; defaultMicrophone: string; levels: string }
): MenuItem[] {
  const levels: MenuItem = {
    key: 'levels',
    label: labels.levels,
    content: <MicLevelMeters source={action.source} micId={action.savedMicId} />
  }
  const sources: MenuItem[] = RECORDING_SOURCES.map((source, index) => ({
    key: source,
    separator: index === 0,
    label: action.sourceLabel(source),
    icon: SOURCE_ICONS[source],
    checked: source === action.source,
    keepOpen: true,
    onSelect: () => action.chooseSource(source)
  }))
  if (!action.usesMicrophone) return [levels, ...sources]

  const microphones: MenuItem[] = [
    { key: '', label: labels.defaultMicrophone },
    ...action.microphones.map((d) => ({ key: d.id, label: d.name }))
  ].map((item) => ({
    ...item,
    key: `mic:${item.key}`,
    checked: item.key === action.micId,
    keepOpen: true,
    onSelect: () => action.chooseMic(item.key)
  }))
  const microphone: MenuItem = {
    key: 'microphone',
    label: labels.microphone,
    icon: MicVocal,
    hint: microphones.find((item) => item.checked)?.label,
    separator: true,
    submenu: microphones
  }
  return [levels, ...sources, microphone]
}

/**
 * Grabar con el micrófono (tarea 29): un clic empieza con la fuente elegida y el botón pasa a
 * un cuadrado rojo con el tiempo grabado. La flecha abre el menú de fuentes y, para Mi voz y
 * Ambos, el submenú de micrófonos.
 */
export function MicButton(): React.JSX.Element {
  const { t } = useTranslation()
  const action = useMicAction()
  const [menuOpen, setMenuOpen] = useState(false)
  const { button } = action

  if (button.kind === 'recording') {
    return (
      <Button
        variant="ghost"
        className="mic-recording"
        aria-label={t('mic.stop')}
        title={`${t('mic.stop')} · ${action.sourceLabel(button.source)}`}
        icon={<Square size={14} strokeWidth={0} fill="currentColor" />}
        onClick={action.toggle}
      >
        <span className="mic-elapsed">{action.elapsed}</span>
        <span className="mic-wave" aria-hidden="true">
          {action.wave.map((level, index) => (
            <span key={index} style={{ transform: `scaleY(${Math.max(0.12, level)})` }} />
          ))}
        </span>
      </Button>
    )
  }

  const title = button.disabled
    ? t('mic.busy')
    : `${t('mic.record')} · ${action.sourceLabel(action.source)}`

  return (
    <div className="menu-anchor mic-split">
      <Button
        variant="ghost"
        aria-label={title}
        disabled={button.disabled}
        icon={<Mic size={16} strokeWidth={1.5} />}
        onClick={action.toggle}
      />
      <Button
        variant="ghost"
        className="mic-chevron"
        aria-label={t('mic.chooseSource')}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        disabled={button.disabled}
        icon={<ChevronDown size={12} strokeWidth={1.5} />}
        onClick={() => {
          if (!menuOpen) action.refreshMicrophones()
          setMenuOpen(!menuOpen)
        }}
      />
      <Menu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        placement="top-start"
        aria-label={t('mic.chooseSource')}
        items={menuItems(action, {
          microphone: t('mic.microphone'),
          defaultMicrophone: t('mic.defaultMicrophone'),
          levels: t('mic.levels')
        })}
      />
    </div>
  )
}

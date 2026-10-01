import { useState } from 'react'
import { ChevronDown, Mic, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RECORDING_SOURCES } from '@shared/recording'
import { useMicAction } from '../application/useMicAction'
import { Button, Menu } from '../../ui'

/**
 * Grabar con el micrófono (tarea 29): un clic empieza con la fuente elegida y el botón pasa a
 * un cuadrado rojo con el tiempo grabado. La flecha abre el menú de fuentes.
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
        onClick={() => setMenuOpen((open) => !open)}
      />
      <Menu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        placement="bottom-end"
        aria-label={t('mic.chooseSource')}
        items={RECORDING_SOURCES.map((source) => ({
          label: action.sourceLabel(source),
          checked: source === action.source,
          onSelect: () => action.chooseSource(source)
        }))}
      />
    </div>
  )
}

import { Keyboard, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_RECORD_SHORTCUT, parseShortcut, shortcutLabel } from '@shared/shortcut'
import { usePorts } from '../application/ports'
import { useHotkeyStatus } from '../application/useHotkeyStatus'
import { useShortcutCapture } from '../application/useShortcutCapture'
import { Button, SettingRow, Toggle } from '../../../ui'

/** Texto de un atajo guardado (`Ctrl + Win`); vacío si no vale. */
function label(shortcut: string): string {
  const parsed = parseShortcut(shortcut)
  return parsed.ok ? shortcutLabel(parsed.shortcut) : ''
}

/** El atajo global para grabar (tarea 31): activarlo, cambiarlo o volver al de siempre. */
export function ShortcutSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const { settings } = usePorts()
  const shortcut = settings.useShortcut()
  const status = useHotkeyStatus()
  const capture = useShortcutCapture()
  const enabled = shortcut !== null

  const warning = capture.error
    ? t(`settings.recordShortcutErrors.${capture.error}`)
    : enabled && status === 'failed'
      ? t('settings.recordShortcutFailed')
      : null

  return (
    <SettingRow
      icon={<Keyboard size={20} strokeWidth={1.5} />}
      title={t('settings.recordShortcut')}
      description={t('settings.recordShortcutDescription')}
      extra={warning && <p className="shortcut-warning">{warning}</p>}
    >
      {enabled && (
        <>
          <Button
            className={capture.capturing ? 'shortcut-capture capturing' : 'shortcut-capture'}
            onClick={capture.capturing ? capture.cancel : capture.start}
          >
            {capture.capturing
              ? shortcutLabel(capture.pressed) || t('settings.recordShortcutCapturing')
              : label(shortcut)}
          </Button>
          <Button
            variant="ghost"
            aria-label={t('settings.recordShortcutReset')}
            icon={<RotateCcw size={16} strokeWidth={1.5} />}
            disabled={shortcut === DEFAULT_RECORD_SHORTCUT}
            onClick={() => settings.setShortcut(DEFAULT_RECORD_SHORTCUT)}
          />
        </>
      )}
      <Toggle
        aria-label={t('settings.recordShortcut')}
        checked={enabled}
        onChange={(on) => settings.setShortcut(on ? DEFAULT_RECORD_SHORTCUT : null)}
      />
    </SettingRow>
  )
}

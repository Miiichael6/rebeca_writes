import { useRef } from 'react'
import { Crosshair } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatClock } from '@renderer/lib/time'
import type { ClipDialog as ClipDialogState } from '../application/useClipDialog'
import { Checkbox, ConfirmDialog } from '../../ui'
import { ClipWaveform } from './ClipWaveform'

interface TimeFieldProps {
  label: string
  value: string
  onChange: (text: string) => void
  onHere: () => void
  onEnter: () => void
  inputRef?: React.RefObject<HTMLInputElement | null>
}

/** Campo de tiempo con el botón "posición actual". */
function TimeField({
  label,
  value,
  onChange,
  onHere,
  onEnter,
  inputRef
}: TimeFieldProps): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <label className="dialog-field">
      {label}
      <span className="clip-time">
        <input
          ref={inputRef}
          className="input"
          value={value}
          placeholder="0:00"
          inputMode="decimal"
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onEnter()
            }
          }}
        />
        <button
          type="button"
          className="player-btn"
          aria-label={t('clip.useCurrent')}
          title={t('clip.useCurrent')}
          onClick={onHere}
        >
          <Crosshair size={16} strokeWidth={1.5} />
        </button>
      </span>
    </label>
  )
}

/** Diálogo "Recortar" (tarea 39): tramo de inicio a fin y si se transcribe el recorte. */
export function ClipDialog({ dialog }: { dialog: ClipDialogState }): React.JSX.Element {
  const { t } = useTranslation()
  const startRef = useRef<HTMLInputElement>(null)

  return (
    <ConfirmDialog
      open={dialog.open}
      title={t('clip.title')}
      confirmLabel={t('clip.confirm')}
      initialFocus={startRef}
      onConfirm={dialog.confirm}
      onCancel={dialog.close}
    >
      <ClipWaveform
        waveform={dialog.waveform}
        duration={dialog.duration}
        start={dialog.start}
        end={dialog.end}
        onRange={dialog.setRange}
      />
      <div className="clip-fields">
        <TimeField
          label={t('clip.start')}
          value={dialog.startText}
          onChange={dialog.setStartText}
          onHere={dialog.startHere}
          onEnter={dialog.confirm}
          inputRef={startRef}
        />
        <TimeField
          label={t('clip.end')}
          value={dialog.endText}
          onChange={dialog.setEndText}
          onHere={dialog.endHere}
          onEnter={dialog.confirm}
        />
      </div>
      <div className={`dialog-hint${dialog.error ? ' clip-error' : ''}`} role="status">
        {dialog.error
          ? t(`clip.error_${dialog.error}`)
          : t('clip.length', { time: formatClock(dialog.length ?? 0) })}
      </div>
      <Checkbox
        className="dialog-check"
        checked={dialog.transcribe}
        onChange={dialog.setTranscribe}
      >
        {t('clip.transcribe')}
      </Checkbox>
      <div className="dialog-hint">{t('clip.hint')}</div>
    </ConfirmDialog>
  )
}

import { Play, RotateCcw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TranscribeAction } from '../application/useTranscribeAction'
import { Button, ConfirmDialog } from '../../ui'

/** Icono y texto: en ventanas angostas solo se ve el icono (el texto sigue en el tooltip). */
function ActionLabel({ icon: Icon, text }: { icon: typeof X; text: string }): React.JSX.Element {
  return (
    <>
      <Icon className="toolbar-action-icon" size={16} strokeWidth={1.75} aria-hidden />
      <span className="toolbar-action-label">{text}</span>
    </>
  )
}

/** Transcribir, volver a transcribir o cancelar, según el estado; con su confirmación. */
export function TranscribeButton({ action }: { action: TranscribeAction }): React.JSX.Element {
  const { t } = useTranslation()
  const { button, blocker } = action

  return (
    <>
      {button?.kind === 'cancel' && (
        <Button
          variant="primary"
          className="toolbar-action"
          title={t('common.cancel')}
          onClick={action.cancel}
        >
          <ActionLabel icon={X} text={t('common.cancel')} />
        </Button>
      )}
      {button?.kind === 'transcribe' && (
        <Button
          variant="primary"
          className="toolbar-action"
          disabled={button.disabled}
          title={
            blocker === 'noMedia'
              ? t('toolbar.transcribeNoMedia')
              : blocker === 'busy'
                ? t('toolbar.transcribeBusy')
                : button.retranscribe
                  ? t('toolbar.retranscribe')
                  : t('toolbar.transcribe')
          }
          onClick={action.request}
        >
          <ActionLabel
            icon={button.retranscribe ? RotateCcw : Play}
            text={button.retranscribe ? t('toolbar.retranscribe') : t('toolbar.transcribe')}
          />
        </Button>
      )}
      <ConfirmDialog
        open={action.confirmingRestart}
        title={t('toolbar.retranscribeTitle')}
        confirmLabel={t('toolbar.retranscribe')}
        danger
        onConfirm={action.confirmRestart}
        onCancel={action.cancelRestart}
      >
        {t('toolbar.retranscribeBody')}
      </ConfirmDialog>
    </>
  )
}

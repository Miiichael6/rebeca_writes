import { useTranslation } from 'react-i18next'
import type { TranscribeAction } from '../application/useTranscribeAction'
import { Button, ConfirmDialog } from '../../ui'

/** Transcribir, volver a transcribir o cancelar, según el estado; con su confirmación. */
export function TranscribeButton({ action }: { action: TranscribeAction }): React.JSX.Element {
  const { t } = useTranslation()
  const { button, blocker } = action

  return (
    <>
      {button?.kind === 'cancel' && (
        <Button variant="primary" className="toolbar-action" onClick={action.cancel}>
          {t('common.cancel')}
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
                : undefined
          }
          onClick={action.request}
        >
          {button.retranscribe ? t('toolbar.retranscribe') : t('toolbar.transcribe')}
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

import { FileUp } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useModalDialog } from '@renderer/lib/useModalDialog'
import { useCustomModelForm } from '../application/useCustomModelForm'
import { Button } from '../../../ui'

interface AddCustomDialogProps {
  open: boolean
  onClose: () => void
}

export function AddCustomDialog({ open, onClose }: AddCustomDialogProps): React.JSX.Element {
  const { t } = useTranslation()
  const titleId = useId()
  const nameId = useId()
  const form = useCustomModelForm((code) => t(`errors.${code}`))

  // El formulario se vacía al abrir, no al cerrar: así no parpadea durante la salida.
  const { ref, state } = useModalDialog(open, form.reset)

  return (
    <dialog
      ref={ref}
      className={`dialog ${state}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div className="dialog-body">
        <h2 id={titleId}>{t('models.addCustomTitle')}</h2>
        <div className="custom-model-form">
          <Button icon={<FileUp size={16} strokeWidth={1.5} />} onClick={() => void form.pick()}>
            {t('models.chooseFile')}
          </Button>
          <div className="custom-model-path" title={form.path ?? undefined}>
            {form.path ?? t('models.noFileChosen')}
          </div>
          <label htmlFor={nameId}>{t('models.customName')}</label>
          <input
            id={nameId}
            className="input"
            value={form.name}
            onChange={(e) => form.setName(e.target.value)}
          />
          {form.error && <div className="custom-model-error">{form.error}</div>}
        </div>
      </div>
      <div className="dialog-actions">
        <Button
          variant="primary"
          disabled={!form.canSubmit}
          onClick={() => void form.submit(onClose)}
        >
          {t('models.add')}
        </Button>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
      </div>
    </dialog>
  )
}

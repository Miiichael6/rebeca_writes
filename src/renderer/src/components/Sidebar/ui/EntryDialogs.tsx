import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { usePorts } from '../application/ports'
import type { EntryActions } from '../application/useEntryActions'
import type { MultiSelect } from '../application/useMultiSelect'
import { shownName } from '../domain/entry'
import { ConfirmDialog } from '../../ui'

interface EntryDialogsProps {
  actions: EntryActions
  select: MultiSelect
  confirmClear: boolean
  onCancelClear: () => void
}

/** Todos los diálogos de confirmación del menú lateral. */
export function EntryDialogs({
  actions,
  select,
  confirmClear,
  onCancelClear
}: EntryDialogsProps): React.JSX.Element {
  const { t } = useTranslation()
  const { history } = usePorts()
  const renameRef = useRef<HTMLInputElement>(null)
  const { dialog } = actions

  return (
    <>
      <ConfirmDialog
        open={confirmClear}
        title={t('sidebar.clearTitle')}
        confirmLabel={t('sidebar.clearConfirm')}
        danger
        onConfirm={() => {
          void history.clear()
          onCancelClear()
        }}
        onCancel={onCancelClear}
      >
        {t('sidebar.clearBody')}
      </ConfirmDialog>

      <ConfirmDialog
        open={select.confirmingRemove}
        title={t('sidebar.removeManyTitle', { count: select.count })}
        confirmLabel={t('sidebar.removeConfirm')}
        danger
        onConfirm={() => void select.removeChecked()}
        onCancel={select.cancelRemove}
      >
        {t('sidebar.removeManyBody', { count: select.count })}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog?.kind === 'rename'}
        title={t('sidebar.renameTitle')}
        confirmLabel={t('sidebar.renameConfirm')}
        initialFocus={renameRef}
        onConfirm={actions.confirmRename}
        onCancel={actions.closeDialog}
      >
        <label className="dialog-field">
          {t('sidebar.renameLabel')}
          <input
            ref={renameRef}
            className="input"
            value={actions.newName}
            placeholder={dialog?.entry.fileName}
            onChange={(e) => actions.setNewName(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                actions.confirmRename()
              }
            }}
          />
        </label>
        <div className="dialog-hint">{t('sidebar.renameHint')}</div>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog?.kind === 'remove'}
        title={t('sidebar.removeTitle')}
        confirmLabel={t('sidebar.removeConfirm')}
        danger
        onConfirm={actions.removeDialogEntry}
        onCancel={actions.closeDialog}
      >
        {dialog && t('sidebar.removeBody', { name: shownName(dialog.entry) })}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog?.kind === 'retranscribe'}
        title={t('toolbar.retranscribeTitle')}
        confirmLabel={t('toolbar.retranscribe')}
        danger
        onConfirm={actions.confirmRetranscribe}
        onCancel={actions.closeDialog}
      >
        {t('toolbar.retranscribeBody')}
      </ConfirmDialog>
    </>
  )
}

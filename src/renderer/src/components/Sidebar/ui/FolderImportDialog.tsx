import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '../../ui'
import type { FolderImport } from '../application/useFolderImport'

/** Última parte de una ruta de carpeta (o la unidad, como `C:`). */
function folderLabel(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}

/** Confirmación de "Abrir carpeta": cuántos documentos se van a transcribir, o que no hay. */
export function FolderImportDialog({ folder }: { folder: FolderImport }): React.JSX.Element {
  const { t } = useTranslation()
  const { scan } = folder
  const name = scan ? folderLabel(scan.folder) : ''
  const empty = scan?.count === 0
  return (
    <ConfirmDialog
      open={scan !== null}
      title={empty ? t('sidebar.folderNoneTitle') : t('sidebar.folderConfirmTitle')}
      confirmLabel={empty ? undefined : t('sidebar.folderConfirm')}
      hideCancel={empty}
      focusConfirm
      onConfirm={empty ? folder.cancel : () => void folder.confirm()}
      onCancel={folder.cancel}
    >
      {empty
        ? t('sidebar.folderNoneBody', { name })
        : t('sidebar.folderConfirmBody', { count: scan?.count ?? 0, name })}
    </ConfirmDialog>
  )
}

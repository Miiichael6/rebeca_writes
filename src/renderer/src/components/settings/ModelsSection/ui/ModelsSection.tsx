import { Layers, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePorts } from '../application/ports'
import { useModelDeletion } from '../application/useModelDeletion'
import { Button, Card, ConfirmDialog } from '../../../ui'
import { AddCustomDialog } from './AddCustomDialog'
import { ModelRow } from './ModelRow'

/** Lista de modelos Whisper en Configuración: descargar, cancelar, reanudar, eliminar y añadir. */
export function ModelsSection(): React.JSX.Element {
  const { t } = useTranslation()
  const { models } = usePorts()
  const list = models.useModels()
  const [adding, setAdding] = useState(false)
  const deletion = useModelDeletion()
  const { target } = deletion

  return (
    <Card>
      <div className="setting-row">
        <span className="setting-row-icon" aria-hidden>
          <Layers size={20} strokeWidth={1.5} />
        </span>
        <div className="setting-row-text">
          <div className="setting-row-title">{t('models.title')}</div>
          <div className="setting-row-description">{t('models.description')}</div>
        </div>
        <div className="setting-row-control">
          <Button icon={<Plus size={16} strokeWidth={1.5} />} onClick={() => setAdding(true)}>
            {t('models.addCustom')}
          </Button>
        </div>
      </div>
      {list.map((m) => (
        <ModelRow key={m.id} model={m} onDelete={deletion.ask} />
      ))}

      <AddCustomDialog open={adding} onClose={() => setAdding(false)} />
      <ConfirmDialog
        open={target !== null}
        title={t(target?.custom ? 'models.removeTitle' : 'models.deleteTitle', {
          name: target?.label
        })}
        confirmLabel={target?.custom ? t('models.remove') : t('models.delete')}
        danger
        onConfirm={deletion.confirm}
        onCancel={deletion.cancel}
      >
        {target?.custom ? t('models.removeBody') : t('models.deleteBody')}
      </ConfirmDialog>
    </Card>
  )
}

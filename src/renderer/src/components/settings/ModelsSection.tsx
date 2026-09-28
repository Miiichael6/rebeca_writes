import { FileUp, Layers, Plus } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ModelProgress, ModelStatus } from '@shared/models'
import { formatBytes } from '@renderer/lib/format'
import { formatClock } from '@renderer/lib/time'
import { useModelsStore } from '@renderer/store/models'
import { Button, Card, ConfirmDialog } from '../ui'

function DownloadProgress({ progress }: { progress?: ModelProgress }): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const received = progress?.received ?? 0
  const total = progress?.total ?? 0
  const percent = total > 0 ? (received / total) * 100 : 0
  return (
    <div className="model-progress">
      <div
        className="model-progress-bar"
        role="progressbar"
        aria-label={t('models.downloading')}
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div style={{ width: `${percent}%` }} />
      </div>
      <span className="model-progress-text">
        {progress
          ? t('models.progress', {
              received: formatBytes(received, i18n.language),
              total: formatBytes(total, i18n.language),
              speed: formatBytes(progress.bytesPerSec, i18n.language)
            })
          : t('models.starting')}
        {progress?.etaSec != null &&
          ` · ${t('transcript.remaining', { time: formatClock(progress.etaSec) })}`}
      </span>
    </div>
  )
}

/** Bajo / Medio / Alto, como en la referencia: Tiny y Base ~1 GB, Small ~2 GB, el resto más. */
function memoryLevel(gb: number): 'low' | 'medium' | 'high' {
  return gb <= 1 ? 'low' : gb <= 2 ? 'medium' : 'high'
}

function ModelRow({
  model,
  onDelete
}: {
  model: ModelStatus
  onDelete: (model: ModelStatus) => void
}): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const progress = useModelsStore((s) => s.progress[model.id])
  const { download, cancel } = useModelsStore.getState()
  const size = (bytes: number): string => formatBytes(bytes, i18n.language)
  const partial = model.state === 'missing' && model.sizeOnDisk > 0

  let sizeText: string
  if (model.custom)
    sizeText = model.state === 'downloaded' ? size(model.sizeOnDisk) : t('models.fileMissing')
  else if (model.state === 'downloaded') sizeText = size(model.sizeOnDisk)
  else if (partial)
    sizeText = t('models.partial', {
      received: size(model.sizeOnDisk),
      total: size(model.sizeBytes ?? 0)
    })
  else sizeText = size(model.sizeBytes ?? 0)

  return (
    <div className="model-row">
      <div className="model-row-main">
        <div className="model-row-text">
          <div className="model-row-name">{model.label}</div>
          {model.custom ? (
            <div className="model-row-meta" title={model.path}>
              {model.path}
            </div>
          ) : (
            <div className="model-row-meta">
              <span>
                {t('models.speed')} <b>{t(`models.speeds.${model.speed!}`)}</b>
              </span>
              <span>
                {t('models.accuracy')} <b>{t(`models.accuracies.${model.accuracy!}`)}</b>
              </span>
              <span>
                {t('models.memory')}{' '}
                <b>
                  {t('models.memoryValue', {
                    level: t(`models.memoryLevels.${memoryLevel(model.memoryGb!)}`),
                    gb: model.memoryGb
                  })}
                </b>
              </span>
            </div>
          )}
        </div>
        {model.state !== 'downloading' && <span className="model-row-size">{sizeText}</span>}
        {model.state === 'downloading' ? (
          <Button onClick={() => cancel(model.id)}>{t('common.cancel')}</Button>
        ) : model.state === 'missing' && !model.custom ? (
          <Button variant="primary" onClick={() => download(model.id)}>
            {partial ? t('models.resume') : t('models.download')}
          </Button>
        ) : null}
        {(model.state === 'downloaded' || model.custom || partial) && (
          <Button onClick={() => onDelete(model)}>
            {model.custom ? t('models.remove') : t('models.delete')}
          </Button>
        )}
      </div>
      {model.state === 'downloading' && <DownloadProgress progress={progress} />}
    </div>
  )
}

function AddCustomDialog({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const nameId = useId()
  const [path, setPath] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const addCustom = useModelsStore((s) => s.addCustom)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      setPath(null)
      setName('')
      setError(null)
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  const pick = async (): Promise<void> => {
    const file = await window.api.models.pickCustomFile()
    if (!file) return
    setPath(file)
    setError(null)
    if (!name) setName(file.replace(/^.*[\\/]/, '').replace(/\.bin$/i, ''))
  }

  const submit = async (): Promise<void> => {
    if (!path) return
    const result = await addCustom(path, name)
    if (result.ok) onClose()
    else setError(t(`errors.${result.code}`))
  }

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div className="dialog-body">
        <h2 id={titleId}>{t('models.addCustomTitle')}</h2>
        <div className="custom-model-form">
          <Button icon={<FileUp size={16} strokeWidth={1.5} />} onClick={pick}>
            {t('models.chooseFile')}
          </Button>
          <div className="custom-model-path" title={path ?? undefined}>
            {path ?? t('models.noFileChosen')}
          </div>
          <label htmlFor={nameId}>{t('models.customName')}</label>
          <input
            id={nameId}
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <div className="custom-model-error">{error}</div>}
        </div>
      </div>
      <div className="dialog-actions">
        <Button variant="primary" disabled={!path} onClick={submit}>
          {t('models.add')}
        </Button>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
      </div>
    </dialog>
  )
}

/** Lista de modelos Whisper en Configuración: descargar, cancelar, reanudar, eliminar y añadir. */
function ModelsSection(): React.JSX.Element {
  const { t } = useTranslation()
  const models = useModelsStore((s) => s.models)
  const remove = useModelsStore((s) => s.remove)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<ModelStatus | null>(null)

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
      {models.map((m) => (
        <ModelRow key={m.id} model={m} onDelete={setDeleting} />
      ))}

      <AddCustomDialog open={adding} onClose={() => setAdding(false)} />
      <ConfirmDialog
        open={deleting !== null}
        title={t(deleting?.custom ? 'models.removeTitle' : 'models.deleteTitle', {
          name: deleting?.label
        })}
        confirmLabel={deleting?.custom ? t('models.remove') : t('models.delete')}
        danger
        onConfirm={() => {
          if (deleting) remove(deleting.id)
          setDeleting(null)
        }}
        onCancel={() => setDeleting(null)}
      >
        {deleting?.custom ? t('models.removeBody') : t('models.deleteBody')}
      </ConfirmDialog>
    </Card>
  )
}

export default ModelsSection

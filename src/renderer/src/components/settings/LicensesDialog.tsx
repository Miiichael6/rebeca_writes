import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { APP_NAME } from '@shared/app'
import { useModalDialog } from '@renderer/lib/useModalDialog'
import { Button } from '../ui'

/** Forma de cada entrada de `assets/third-party-licenses.json` (lo genera `npm run licenses`). */
interface ThirdPartyLicense {
  name: string
  version: string
  license: string
  url: string
  text: string
}

/**
 * Reconocimientos de software de terceros. El JSON (~60 KB) se carga al abrir, no con la
 * página de Configuración.
 */
function LicensesDialog({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const titleId = useId()
  const [licenses, setLicenses] = useState<ThirdPartyLicense[] | null>(null)
  const { ref, state } = useModalDialog(open)

  // El JSON solo se pide la primera vez que se abre el diálogo, no con la página.
  useEffect(() => {
    if (!open || licenses) return
    let alive = true
    import('@renderer/assets/third-party-licenses.json')
      .then((m) => alive && setLicenses(m.default as ThirdPartyLicense[]))
      .catch((err) => console.error('No se pudieron cargar las licencias', err))
    return () => {
      alive = false
    }
  }, [open, licenses])

  return (
    <dialog
      ref={ref}
      className={`dialog dialog-wide ${state}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div className="dialog-body">
        <h2 id={titleId}>{t('settings.thirdParty')}</h2>
        <p className="dialog-text">{t('settings.thirdPartyIntro', { app: APP_NAME })}</p>
        <div className="licenses">
          {licenses?.map((l) => (
            <details key={l.name} className="license">
              <summary>
                <span className="license-name">{l.name}</span>
                {l.version && <span className="license-version">{l.version}</span>}
                <span className="license-type">{l.license}</span>
              </summary>
              <a href={l.url} target="_blank" rel="noreferrer">
                {l.url}
              </a>
              {l.text && <pre>{l.text}</pre>}
            </details>
          ))}
        </div>
      </div>
      <div className="dialog-actions">
        <Button variant="primary" onClick={onClose} autoFocus>
          {t('common.close')}
        </Button>
      </div>
    </dialog>
  )
}

export default LicensesDialog

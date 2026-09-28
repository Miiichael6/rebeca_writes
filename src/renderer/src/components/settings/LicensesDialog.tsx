import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { APP_NAME } from '@shared/app'
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
function LicensesDialog({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [licenses, setLicenses] = useState<ThirdPartyLicense[] | null>(null)

  useEffect(() => {
    ref.current?.showModal()
    let alive = true
    import('@renderer/assets/third-party-licenses.json')
      .then((m) => alive && setLicenses(m.default as ThirdPartyLicense[]))
      .catch((err) => console.error('No se pudieron cargar las licencias', err))
    return () => {
      alive = false
    }
  }, [])

  return (
    <dialog
      ref={ref}
      className="dialog dialog-wide"
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

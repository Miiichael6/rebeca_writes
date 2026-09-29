import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { APP_NAME } from '@shared/app'
import logo from '@renderer/assets/logo.svg'
import LicensesDialog from './LicensesDialog'
import UpdatesSection from './UpdatesSection'

/** Acerca de: nombre, versión, registros y reconocimientos de terceros. */
function AboutSection(): React.JSX.Element {
  const { t } = useTranslation()
  const [version, setVersion] = useState('')
  const [licensesOpen, setLicensesOpen] = useState(false)

  useEffect(() => {
    window.api.app.getVersion().then(setVersion, console.error)
  }, [])

  return (
    <div className="card about">
      <img className="about-logo" src={logo} alt="" width={48} height={48} />
      <div className="about-text">
        <h3>{APP_NAME}</h3>
        <p>{t('settings.aboutDescription', { version })}</p>
        <div className="about-links">
          <button
            type="button"
            className="link-button"
            onClick={() => window.api.app.openLogs().catch(console.error)}
          >
            {t('settings.viewLogs')}
          </button>
          <button type="button" className="link-button" onClick={() => setLicensesOpen(true)}>
            {t('settings.thirdParty')}
          </button>
        </div>
        <UpdatesSection />
      </div>
      <LicensesDialog open={licensesOpen} onClose={() => setLicensesOpen(false)} />
    </div>
  )
}

export default AboutSection

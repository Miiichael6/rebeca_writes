import { ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '@renderer/store/ui'
import { Button, SettingsSection } from '../ui'
import AboutSection from './AboutSection'
import BackendSetting from './BackendSetting'
import InterfaceSettings from './InterfaceSettings'
import ModelsSection from './ModelsSection'
import StorageSettings from './StorageSettings'
import TranscriptionOptions from './TranscriptionOptions'

/** Página de Configuración (Screenshots 24–27). Cada cambio se guarda al momento. */
function SettingsPage(): React.JSX.Element {
  const { t } = useTranslation()
  const setView = useUiStore((s) => s.setView)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) setView('main')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setView])

  return (
    <div className="settings-page">
      <header className="settings-header">
        <Button
          variant="ghost"
          aria-label={t('common.back')}
          icon={<ArrowLeft size={18} strokeWidth={1.5} />}
          onClick={() => setView('main')}
          autoFocus
        />
        <h1>{t('settings.title')}</h1>
      </header>
      <div className="settings-content">
        <SettingsSection title={t('settings.models')}>
          <BackendSetting />
          <ModelsSection />
          <TranscriptionOptions />
        </SettingsSection>
        <SettingsSection title={t('settings.interface')}>
          <InterfaceSettings />
        </SettingsSection>
        <SettingsSection title={t('settings.storage')}>
          <StorageSettings />
        </SettingsSection>
        <SettingsSection title={t('settings.about')}>
          <AboutSection />
        </SettingsSection>
      </div>
    </div>
  )
}

export default SettingsPage

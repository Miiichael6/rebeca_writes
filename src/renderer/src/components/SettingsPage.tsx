import { ArrowLeft, Languages } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_UI_LANGUAGES, type UiLanguageSetting } from '@shared/i18n'
import { useUiStore } from '@renderer/store/ui'
import { Button, Select, SettingRow, SettingsSection } from './ui'

/**
 * Página de Configuración. Por ahora solo el idioma de la interfaz; el resto del contenido
 * es de la tarea 21.
 */
function SettingsPage(): React.JSX.Element {
  const { t } = useTranslation()
  const setView = useUiStore((s) => s.setView)
  const uiLanguage = useUiStore((s) => s.uiLanguage)
  const setUiLanguage = useUiStore((s) => s.setUiLanguage)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) setView('main')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setView])

  // Cada idioma con su nombre nativo, para que se reconozca aunque la interfaz esté en otro.
  const languageOptions = [
    { value: 'system' as const, label: t('settings.uiLanguageSystem') },
    ...SUPPORTED_UI_LANGUAGES.map((l) => ({ value: l.code, label: l.nativeName }))
  ]

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
        <SettingsSection title={t('settings.interface')}>
          <SettingRow
            icon={<Languages size={20} strokeWidth={1.5} />}
            title={t('settings.uiLanguage')}
            description={t('settings.uiLanguageDescription')}
          >
            <Select<UiLanguageSetting>
              aria-label={t('settings.uiLanguage')}
              value={uiLanguage}
              onChange={setUiLanguage}
              options={languageOptions}
            />
          </SettingRow>
        </SettingsSection>
        <p className="settings-placeholder">{t('settings.placeholder')}</p>
      </div>
    </div>
  )
}

export default SettingsPage

import { Captions, Languages, Palette, RectangleHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_UI_LANGUAGES, type UiLanguageSetting } from '@shared/i18n'
import { VIDEO_HEIGHT_MIN, VIDEO_HEIGHT_SLIDER_MAX } from '@shared/settings'
import type { ThemeMode } from '@shared/theme'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { Select, SettingRow, Slider, Toggle } from '../ui'

/** Interfaz (Screenshot_26): subtítulos, altura del video, tema e idioma. */
function InterfaceSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const showCaptions = useSettingsStore((s) => s.settings.showCaptions)
  const videoHeight = useSettingsStore((s) => s.settings.videoHeight)
  const theme = useSettingsStore((s) => s.settings.theme)
  const uiLanguage = useSettingsStore((s) => s.settings.uiLanguage)

  const themeOptions = (['light', 'dark', 'system'] as const).map((value) => ({
    value,
    label: t(`settings.themes.${value}`)
  }))
  // Cada idioma con su nombre nativo, para que se reconozca aunque la interfaz esté en otro.
  const languageOptions = [
    { value: 'system' as const, label: t('settings.uiLanguageSystem') },
    ...SUPPORTED_UI_LANGUAGES.map((l) => ({ value: l.code, label: l.nativeName }))
  ]

  return (
    <>
      <SettingRow
        icon={<Captions size={20} strokeWidth={1.5} />}
        title={t('settings.showCaptions')}
        description={t('settings.showCaptionsDescription')}
      >
        <Toggle
          aria-label={t('settings.showCaptions')}
          checked={showCaptions}
          onChange={(value) => updateSettings({ showCaptions: value })}
        />
      </SettingRow>
      <SettingRow
        icon={<RectangleHorizontal size={20} strokeWidth={1.5} />}
        title={t('settings.videoHeight')}
        description={t('settings.videoHeightDescription')}
      >
        <div className="setting-slider">
          <Slider
            aria-label={t('settings.videoHeight')}
            value={videoHeight}
            min={VIDEO_HEIGHT_MIN}
            max={VIDEO_HEIGHT_SLIDER_MAX}
            step={10}
            onChange={(value) => updateSettings({ videoHeight: value })}
          />
          <span className="setting-value">
            {t('settings.videoHeightCurrent')} <strong>{videoHeight}</strong> px
          </span>
        </div>
      </SettingRow>
      <SettingRow
        icon={<Palette size={20} strokeWidth={1.5} />}
        title={t('settings.theme')}
        description={t('settings.themeDescription')}
      >
        <Select<ThemeMode>
          aria-label={t('settings.theme')}
          value={theme}
          onChange={(value) => updateSettings({ theme: value })}
          options={themeOptions}
        />
      </SettingRow>
      <SettingRow
        icon={<Languages size={20} strokeWidth={1.5} />}
        title={t('settings.uiLanguage')}
        description={t('settings.uiLanguageDescription')}
      >
        <Select<UiLanguageSetting>
          aria-label={t('settings.uiLanguage')}
          value={uiLanguage}
          onChange={(value) => updateSettings({ uiLanguage: value })}
          options={languageOptions}
        />
      </SettingRow>
    </>
  )
}

export default InterfaceSettings

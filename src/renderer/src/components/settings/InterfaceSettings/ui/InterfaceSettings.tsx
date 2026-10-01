import { Captions, Languages, Palette, RectangleHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { UiLanguageSetting } from '@shared/i18n'
import { VIDEO_HEIGHT_MIN, VIDEO_HEIGHT_SLIDER_MAX } from '@shared/settings'
import type { ThemeMode } from '@shared/theme'
import { usePorts } from '../application/ports'
import { languageOptions, themeOptions } from '../domain/options'
import { Select, SettingRow, Slider, Toggle } from '../../../ui'

/** Interfaz (Screenshot_26): subtítulos, altura del video, tema e idioma. */
export function InterfaceSettings(): React.JSX.Element {
  const { t } = useTranslation()
  const { settings } = usePorts()
  const { showCaptions, videoHeight, theme, uiLanguage } = settings.useInterface()
  const themes = themeOptions((mode) => t(`settings.themes.${mode}`))
  const languages = languageOptions(t('settings.uiLanguageSystem'))

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
          onChange={(value) => settings.setShowCaptions(value)}
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
            onChange={(value) => settings.setVideoHeight(value)}
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
          onChange={(value) => settings.setTheme(value)}
          options={themes}
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
          onChange={(value) => settings.setUiLanguage(value)}
          options={languages}
        />
      </SettingRow>
    </>
  )
}

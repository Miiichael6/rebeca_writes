import { useState } from 'react'
import {
  AudioLines,
  AudioWaveform,
  Check,
  ChevronDown,
  Cpu,
  Download,
  Languages,
  Star
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  useLanguageChoice,
  useModelChoice,
  useVadChoice,
  type Choice
} from '../application/useTranscriptionChoice'
import { useFavoriteLanguages, type FavoriteLanguages } from '../application/useFavoriteLanguages'
import { MORE_MODELS } from '../domain/toolbar'
import { Menu, type MenuItem } from '../../ui'

/**
 * Opciones de un combo como ítems de submenú; la elegida lleva la marca. Elegir no cierra ni el
 * menú ni el submenú: la marca y el resumen del botón cambian a la vista.
 */
function choiceItems(choice: Choice, extra?: (value: string) => Partial<MenuItem>): MenuItem[] {
  return choice.options
    .filter((o) => o.value !== '')
    .map((o) => ({
      key: o.value,
      label: o.label,
      checked: o.value === choice.value,
      icon: o.value === choice.value ? Check : undefined,
      onSelect: () => choice.onChange(o.value),
      ...extra?.(o.value)
    }))
}

interface Favorites extends FavoriteLanguages {
  labels: { add: string; remove: string }
}

/**
 * Submenú de idiomas en tres bloques separados por una línea: «Detectar automáticamente», una
 * copia de los marcados con estrella (en el orden en que se marcaron) y la lista alfabética
 * completa, donde los favoritos siguen en su sitio con la estrella rellena.
 */
function languageItems(items: MenuItem[], favorites: Favorites): MenuItem[] {
  const [auto, ...languages] = items
  const withStar = (item: MenuItem): MenuItem => {
    const code = item.key ?? ''
    const active = favorites.isFavorite(code)
    return {
      ...item,
      action: {
        icon: Star,
        label: active ? favorites.labels.remove : favorites.labels.add,
        active,
        onToggle: () => favorites.toggle(code)
      }
    }
  }
  // La copia necesita otra clave: el mismo idioma aparece dos veces en el menú.
  const starred = favorites.copies.flatMap(({ code, motion }) =>
    languages
      .filter((l) => l.key === code)
      .map((l) => ({ ...withStar(l), key: `fav:${code}`, motion }))
  )
  const startGroup = (group: MenuItem[]): MenuItem[] =>
    group.map((item, i) => (i === 0 ? { ...item, separator: true } : item))
  return [auto, ...startGroup(starred), ...startGroup(languages.map(withStar))]
}

/**
 * Modelo, idioma y filtro de voz: lo que se elige antes de transcribir. Un solo botón con el
 * resumen («Small · Español») que abre un menú con un submenú para modelo e idioma.
 */
export function ChoiceFields({
  locked,
  model
}: {
  locked: boolean
  model: ReturnType<typeof useModelChoice>
}): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const language = useLanguageChoice(i18n.language, t('toolbar.autoDetect'))
  const vad = useVadChoice()
  const [open, setOpen] = useState(false)
  const favorites: Favorites = {
    ...useFavoriteLanguages(),
    labels: { add: t('toolbar.addFavorite'), remove: t('toolbar.removeFavorite') }
  }

  const label = (choice: Choice): string | undefined =>
    choice.options.find((o) => o.value === choice.value)?.label
  const modelLabel = label(model) ?? t('toolbar.noModels')
  const languageLabel = label(language) ?? ''

  const items: MenuItem[] = [
    {
      key: 'model',
      label: t('toolbar.modelItem'),
      icon: Cpu,
      hint: modelLabel,
      submenu: choiceItems(model, (value) =>
        // «Descargar más modelos» sí cierra: lleva a Configuración.
        value === MORE_MODELS ? { separator: true, icon: Download, keepOpen: false } : {}
      )
    },
    {
      key: 'language',
      label: t('toolbar.languageItem'),
      icon: Languages,
      hint: languageLabel,
      submenu: languageItems(choiceItems(language), favorites)
    },
    {
      // Se activa y desactiva sin cerrar el menú: el interruptor cambia a la vista.
      key: 'vad',
      label: t('toolbar.detectVoice'),
      description: t('toolbar.detectVoiceHint'),
      icon: AudioWaveform,
      toggled: vad.value,
      keepOpen: true,
      separator: true,
      onSelect: vad.toggle
    }
  ]

  return (
    <div className="menu-anchor choice-anchor">
      <button
        type="button"
        className="choice-trigger"
        disabled={locked}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${t('toolbar.modelItem')}: ${modelLabel} · ${t('toolbar.languageItem')}: ${languageLabel}`}
        onClick={() => setOpen((v) => !v)}
      >
        <AudioLines size={16} strokeWidth={1.5} className="choice-trigger-icon" aria-hidden />
        <span key={modelLabel} className="choice-trigger-value choice-trigger-model">
          {modelLabel}
        </span>
        <span className="choice-trigger-dot" aria-hidden>
          ·
        </span>
        <span key={languageLabel} className="choice-trigger-value">
          {languageLabel}
        </span>
        <ChevronDown size={14} strokeWidth={1.5} className="choice-trigger-chevron" aria-hidden />
      </button>
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        aria-label={t('toolbar.choiceMenu')}
      />
    </div>
  )
}

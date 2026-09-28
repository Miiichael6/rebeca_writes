import { describe, expect, it } from 'vitest'
import { SUPPORTED_UI_LANGUAGES, matchUiLanguage } from '@shared/i18n'
import { WHISPER_LANGUAGES } from '@shared/whisper'
import { whisperLanguageOptions } from '@renderer/lib/languages'
import en from '@renderer/i18n/locales/en.json'
import es from '@renderer/i18n/locales/es.json'
import ptBR from '@renderer/i18n/locales/pt-BR.json'

const locales: Record<string, object> = { es, en, 'pt-BR': ptBR }

const PLURAL = /_(zero|one|two|few|many|other)$/

/** Claves hoja como `sidebar.queue`; los plurales se juntan en su clave base. */
function keysOf(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' ? keysOf(v, `${prefix}${k}.`) : [`${prefix}${k}`.replace(PLURAL, '')]
  )
}

describe('matchUiLanguage', () => {
  it('usa la etiqueta exacta o el idioma base, en orden de preferencia', () => {
    expect(matchUiLanguage(['pt-BR'])).toBe('pt-BR')
    expect(matchUiLanguage(['pt-PT'])).toBe('pt-BR')
    expect(matchUiLanguage(['en-GB', 'es-ES'])).toBe('en')
    expect(matchUiLanguage(['es-419'])).toBe('es')
    expect(matchUiLanguage(['fr-FR', 'en-US'])).toBe('en')
  })

  it('cae en español si no hay coincidencia', () => {
    expect(matchUiLanguage(['fr-FR', 'de-DE'])).toBe('es')
    expect(matchUiLanguage([])).toBe('es')
  })
})

describe('locales', () => {
  it('hay un archivo por idioma soportado', () => {
    expect(Object.keys(locales).sort()).toEqual(SUPPORTED_UI_LANGUAGES.map((l) => l.code).sort())
  })

  it('todos tienen las mismas claves que es.json', () => {
    const reference = [...new Set(keysOf(es))].sort()
    for (const locale of Object.values(locales)) {
      expect([...new Set(keysOf(locale))].sort()).toEqual(reference)
    }
  })

  it('cada plural cubre todas las categorías del idioma', () => {
    for (const [code, locale] of Object.entries(locales)) {
      const categories = new Intl.PluralRules(code).resolvedOptions().pluralCategories
      const flat = JSON.stringify(locale)
      const bases = new Set([...flat.matchAll(/"(\w+)_(?:one|other)"/g)].map((m) => m[1]))
      for (const base of bases) {
        for (const category of categories) {
          expect(flat, `${code}: ${base}_${category}`).toContain(`"${base}_${category}"`)
        }
      }
    }
  })
})

describe('whisperLanguageOptions', () => {
  it('pone "auto" primero y los idiomas ordenados en el idioma de la interfaz', () => {
    const options = whisperLanguageOptions('es', 'Detectar automáticamente')
    expect(options[0]).toEqual({ value: 'auto', label: 'Detectar automáticamente' })
    expect(options).toHaveLength(WHISPER_LANGUAGES.length + 1)

    const labels = options.slice(1).map((o) => o.label)
    expect(labels).toEqual([...labels].sort(new Intl.Collator('es').compare))
    expect(options.find((o) => o.value === 'en')?.label).toBe('Inglés')
    expect(options.find((o) => o.value === 'jw')?.label).toBe('Javanés')
  })

  it('traduce los nombres según el idioma de la interfaz', () => {
    const find = (ui: string): string | undefined =>
      whisperLanguageOptions(ui, 'auto').find((o) => o.value === 'de')?.label
    expect(find('en')).toBe('German')
    expect(find('pt-BR')).toBe('Alemão')
  })
})

import 'i18next'
import type es from './locales/es.json'

// Claves tipadas: `t('toolbar.transcribe')` se comprueba contra es.json, el idioma de referencia.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof es }
  }
}

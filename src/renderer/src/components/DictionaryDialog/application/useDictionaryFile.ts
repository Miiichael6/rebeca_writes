import { useTranslation } from 'react-i18next'
import type { DictionaryEntry, DictionaryFileFormat } from '@shared/dictionary'
import {
  DictionaryFileError,
  mergeEntries,
  parseCsv,
  parseJson,
  serializeCsv,
  serializeJson
} from '../domain/dictionaryFile'
import { savableEntries } from '../domain/entries'
import { usePorts } from './ports'

export interface DictionaryFileActions {
  importFile: () => void
  exportFile: (format: DictionaryFileFormat) => void
}

/**
 * Importar y exportar el diccionario. El main abre los diálogos y lee o escribe el archivo; aquí
 * se convierte a y desde la lista. Lo importado se fusiona con lo que hay, sin borrar nada.
 */
export function useDictionaryFile(
  entries: DictionaryEntry[],
  replaceAll: (entries: DictionaryEntry[]) => void
): DictionaryFileActions {
  const { t } = useTranslation()
  const { dictionary, feedback } = usePorts()

  return {
    importFile: () => {
      dictionary
        .importFile()
        .then((file) => {
          if (!file) return
          const imported = file.format === 'csv' ? parseCsv(file.content) : parseJson(file.content)
          const result = mergeEntries(entries, imported, feedback.createId)
          if (result.added + result.updated === 0) {
            feedback.toast(t('dictionary.importNothing'))
            return
          }
          replaceAll(result.entries)
          feedback.toast(
            t('dictionary.imported', {
              added: t('dictionary.addedCount', { count: result.added }),
              updated: t('dictionary.updatedCount', { count: result.updated })
            })
          )
        })
        .catch((err: unknown) => {
          if (!(err instanceof DictionaryFileError)) console.error('No se pudo importar', err)
          feedback.toast(t('dictionary.importFailed'))
        })
    },
    exportFile: (format) => {
      const list = savableEntries(entries)
      const content = format === 'csv' ? serializeCsv(list) : serializeJson(list)
      dictionary
        .exportFile(content, format, t(`dictionary.filter.${format}`))
        .then((path) => path && feedback.toast(t('dictionary.exported')))
        .catch((err: unknown) => {
          console.error('No se pudo exportar el diccionario', err)
          feedback.toast(t('dictionary.exportFailed'))
        })
    }
  }
}

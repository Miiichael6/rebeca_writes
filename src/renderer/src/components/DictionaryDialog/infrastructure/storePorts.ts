import { toast } from '@renderer/store/toast'
import { useUiStore } from '@renderer/store/ui'
import type { DictionaryDialogPorts } from '../application/ports'

/** Adaptadores de los puertos sobre el API del preload y los stores de Zustand. */
export const storePorts: DictionaryDialogPorts = {
  dictionary: {
    load: () => window.api.dictionary.get(),
    save: (entries) => window.api.dictionary.set(entries),
    importFile: () => window.api.dictionary.importFile(),
    exportFile: (content, format, filterLabel) =>
      window.api.dictionary.exportFile(content, format, filterLabel)
  },
  visibility: {
    useOpen: () => useUiStore((s) => s.dictionaryOpen),
    close: () => useUiStore.getState().setDictionaryOpen(false)
  },
  feedback: {
    toast: (message) => toast(message),
    createId: () => crypto.randomUUID()
  }
}

import { useModelsStore } from '@renderer/store/models'
import type { ModelsSectionPorts } from '../application/ports'

/**
 * Adaptadores de los puertos sobre el store de modelos y `window.api`. Es el único sitio de la
 * sección que los conoce.
 */
export const storePorts: ModelsSectionPorts = {
  models: {
    useModels: () => useModelsStore((s) => s.models),
    useProgress: (id) => useModelsStore((s) => s.progress[id]),
    download: (id) => useModelsStore.getState().download(id),
    cancel: (id) => useModelsStore.getState().cancel(id),
    remove: (id) => useModelsStore.getState().remove(id),
    addCustom: (path, name) => useModelsStore.getState().addCustom(path, name),
    pickCustomFile: () => window.api.models.pickCustomFile()
  }
}

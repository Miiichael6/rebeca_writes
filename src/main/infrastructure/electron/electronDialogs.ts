import { BrowserWindow, dialog } from 'electron'
import { mediaFileFilters, type MediaFilterKey } from '@shared/formats'
import type { DialogOwner, Dialogs } from '../../application/ports/dialogs'

/** Muestra el diálogo anclado a su ventana si hay una; el tipo de `owner` lo pone `ipc.ts`. */
function showOpen(
  owner: DialogOwner,
  options: Electron.OpenDialogOptions
): Promise<Electron.OpenDialogReturnValue> {
  return owner
    ? dialog.showOpenDialog(owner as BrowserWindow, options)
    : dialog.showOpenDialog(options)
}

/** Adaptador de `Dialogs` sobre los diálogos de Electron. */
export const electronDialogs: Dialogs = {
  async pickMediaFiles(owner, filterLabels: Record<MediaFilterKey, string>, multiple) {
    const label = (key: MediaFilterKey): string => {
      const value = filterLabels?.[key]
      return typeof value === 'string' && value ? value : key
    }
    const result = await showOpen(owner, {
      properties: multiple ? ['openFile', 'multiSelections'] : ['openFile'],
      filters: mediaFileFilters(label)
    })
    return result.canceled ? [] : result.filePaths
  },

  async pickModelFile(owner) {
    const result = await showOpen(owner, {
      properties: ['openFile'],
      filters: [{ name: 'GGML', extensions: ['bin'] }]
    })
    return result.canceled ? null : (result.filePaths[0] ?? null)
  },

  async pickSavePath(owner, { defaultPath, filterName, extension }) {
    const options = { defaultPath, filters: [{ name: filterName, extensions: [extension] }] }
    const result = owner
      ? await dialog.showSaveDialog(owner as BrowserWindow, options)
      : await dialog.showSaveDialog(options)
    return result.canceled || !result.filePath ? null : result.filePath
  }
}

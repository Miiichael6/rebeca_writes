import { shell } from 'electron'
import type { Shell } from '../../application/ports/shell'

/** Adaptador de `Shell`: el Explorador de Windows. */
export const electronShell: Shell = {
  showItemInFolder: (path) => shell.showItemInFolder(path)
}

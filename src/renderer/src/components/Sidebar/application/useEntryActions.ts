import { useCallback, useState } from 'react'
import type { HistoryEntry, RenameFileFailure } from '@shared/types'
import { shownName, type EntryDialog } from '../domain/entry'
import { menuAnchor } from '../domain/interaction'
import { usePorts } from './ports'

export interface EntryMenuState {
  entry: HistoryEntry
  x: number
  y: number
}

interface Options {
  /** Aviso ya traducido tras intentar volver a encolar el archivo. */
  requeueMessage: (added: boolean, name: string) => string
  /** Aviso ya traducido cuando no se pudo renombrar el archivo original. */
  renameFileMessage: (reason: RenameFileFailure, name: string) => string
}

export interface EntryActions {
  menu: EntryMenuState | null
  openMenu: (entry: HistoryEntry, e: React.MouseEvent<HTMLElement>) => void
  closeMenu: () => void
  dialog: EntryDialog | null
  closeDialog: () => void
  askRemove: (entry: HistoryEntry) => void
  removeDialogEntry: () => void
  startRename: (entry: HistoryEntry) => void
  newName: string
  setNewName: (name: string) => void
  /** Marcado en el diálogo: renombrar también el archivo original en disco. */
  renameFile: boolean
  setRenameFile: (on: boolean) => void
  confirmRename: () => void
  /** Vuelve a encolar; si tiene ediciones a mano (se perderían) pide confirmar antes. */
  retranscribe: (entry: HistoryEntry) => void
  confirmRetranscribe: () => void
}

/** Acciones sobre una entrada del historial: menú contextual, renombrar, quitar y rehacer. */
export function useEntryActions({ requeueMessage, renameFileMessage }: Options): EntryActions {
  const { history, notifier } = usePorts()
  const [menu, setMenu] = useState<EntryMenuState | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  const [dialog, setDialog] = useState<EntryDialog | null>(null)
  const closeDialog = useCallback(() => setDialog(null), [])
  const [newName, setNewName] = useState('')
  const [renameFile, setRenameFile] = useState(false)
  const startRename = useCallback((entry: HistoryEntry) => {
    setNewName(shownName(entry))
    // Tocar el disco es más serio que cambiar el nombre mostrado: nunca viene marcado.
    setRenameFile(false)
    setDialog({ kind: 'rename', entry })
  }, [])

  const queueAgain = async (entry: HistoryEntry): Promise<void> => {
    const added = await history.retranscribe(entry.id).catch(() => false)
    notifier.notify(requeueMessage(added, shownName(entry)))
  }

  return {
    menu,
    openMenu: (entry, e) => {
      e.preventDefault()
      setMenu({ entry, ...menuAnchor(e, e.currentTarget.getBoundingClientRect()) })
    },
    closeMenu,
    dialog,
    closeDialog,
    askRemove: (entry) => setDialog({ kind: 'remove', entry }),
    removeDialogEntry: () => {
      if (dialog) void history.remove(dialog.entry.id)
      setDialog(null)
    },
    startRename,
    newName,
    setNewName,
    renameFile,
    setRenameFile,
    confirmRename: () => {
      if (dialog?.kind !== 'rename') return
      const { entry } = dialog
      if (renameFile && newName.trim()) {
        void history.renameFile(entry.id, newName).then((reason) => {
          if (reason) notifier.notify(renameFileMessage(reason, shownName(entry)))
        })
      } else {
        void history.rename(entry.id, newName)
      }
      setDialog(null)
    },
    retranscribe: (entry) => {
      void history.hasEdits(entry.id).then((edited) => {
        if (edited) setDialog({ kind: 'retranscribe', entry })
        else void queueAgain(entry)
      })
    },
    confirmRetranscribe: () => {
      if (dialog) void queueAgain(dialog.entry)
      setDialog(null)
    }
  }
}

import { useCallback, useState } from 'react'
import type { HistoryEntry } from '@shared/types'
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
  confirmRename: () => void
  /** Vuelve a encolar; si tiene ediciones a mano (se perderían) pide confirmar antes. */
  retranscribe: (entry: HistoryEntry) => void
  confirmRetranscribe: () => void
}

/** Acciones sobre una entrada del historial: menú contextual, renombrar, quitar y rehacer. */
export function useEntryActions({ requeueMessage }: Options): EntryActions {
  const { history, notifier } = usePorts()
  const [menu, setMenu] = useState<EntryMenuState | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  const [dialog, setDialog] = useState<EntryDialog | null>(null)
  const closeDialog = useCallback(() => setDialog(null), [])
  const [newName, setNewName] = useState('')

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
    startRename: (entry) => {
      setNewName(shownName(entry))
      setDialog({ kind: 'rename', entry })
    },
    newName,
    setNewName,
    confirmRename: () => {
      if (dialog?.kind !== 'rename') return
      void history.rename(dialog.entry.id, newName)
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

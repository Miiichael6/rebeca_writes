import { join } from 'path'
import { app } from 'electron'
import log from 'electron-log/main'
import { HistoryStore } from './historyStore'

/** Instancia única del historial en `userData/history/`. El IPC para el renderer llega en la tarea 18. */

let store: HistoryStore | null = null

export function history(): HistoryStore {
  store ??= new HistoryStore({
    dir: join(app.getPath('userData'), 'history'),
    onCorrupt: (backup, err) => log.error(`Historial corrupto; respaldado en ${backup}`, err)
  })
  return store
}

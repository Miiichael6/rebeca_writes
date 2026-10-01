import { spawn } from 'child_process'
import { mkdir } from 'fs/promises'
import { Notification, shell } from 'electron'

/** Notificaciones mostradas: sin una referencia viva, el GC se las lleva y el clic no llega. */
const notifications = new Set<Notification>()

/** Notificación de Windows; `onClick` abre la ventana principal (aunque se haya cerrado). */
export function notify(onClick: () => void, title: string, body: string): void {
  if (!Notification.isSupported()) return
  const notification = new Notification({ title, body })
  notifications.add(notification)
  notification.on('close', () => notifications.delete(notification))
  notification.on('click', () => {
    notifications.delete(notification)
    onClick()
  })
  notification.show()
}

/**
 * Abre una carpeta en el Explorador; la crea si todavía no existe. En Windows se lanza
 * `explorer.exe` directamente: `shell.openPath` depende del verbo por defecto de las carpetas en
 * el registro y, si otro programa lo dejó roto, Windows responde "No se ha encontrado la
 * aplicación".
 */
export async function openFolder(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
  if (process.platform === 'win32') return openInExplorer(dir)
  const error = await shell.openPath(dir)
  if (error) throw new Error(error)
}

/** Resuelve en cuanto el Explorador arranca (su código de salida no indica error: suele ser 1). */
function openInExplorer(dir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('explorer.exe', [dir], { detached: true, stdio: 'ignore' })
    child.once('error', reject)
    child.once('spawn', () => {
      child.unref()
      resolve()
    })
  })
}

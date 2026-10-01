import { mkdir } from 'fs/promises'
import { BrowserWindow, Notification, shell } from 'electron'

/** Notificaciones mostradas: sin una referencia viva, el GC se las lleva y el clic no llega. */
const notifications = new Set<Notification>()

/** Notificación de Windows; al hacer clic se enfoca la ventana. */
export function notify(window: BrowserWindow | null, title: string, body: string): void {
  if (!Notification.isSupported()) return
  const notification = new Notification({ title, body })
  notifications.add(notification)
  notification.on('close', () => notifications.delete(notification))
  notification.on('click', () => {
    notifications.delete(notification)
    if (!window || window.isDestroyed()) return
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
  })
  notification.show()
}

/** Abre una carpeta de `userData` en el Explorador; la crea si todavía no existe. */
export async function openFolder(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
  const error = await shell.openPath(dir)
  if (error) throw new Error(error)
}

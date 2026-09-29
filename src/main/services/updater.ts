import { existsSync } from 'fs'
import { join } from 'path'
import { app, BrowserWindow } from 'electron'
import { autoUpdater, type ProgressInfo, type UpdateInfo } from 'electron-updater'
import log from 'electron-log/main'
import { IpcChannel } from '@shared/ipc'
import type { UpdateInstallResult, UpdateStatus } from '@shared/types'
import { isTranscribing } from '../engine/transcribeManager'
import { isCudaBusy } from './cudaPackage'
import { freeDiskSpace } from './modelDownload'
import { installBlocker, shouldAutoCheck, updateErrorCode } from './updatePolicy'
import { getSettings } from './settings'

/** Margen libre extra sobre el tamaño del Release al descargar. */
const DISK_MARGIN_BYTES = 100 * 1024 * 1024
/** Espera tras abrir la ventana antes de la comprobación automática. */
const AUTO_CHECK_DELAY_MS = 10_000

let status: UpdateStatus = { state: 'idle' }
let lastCheckAt: number | null = null
let phase: 'check' | 'download' = 'check'
let available: { version: string; sizeBytes: number } | null = null
let configured = false

/** Con `dev-app-update.yml` junto al proyecto se puede probar el flujo sin empaquetar. */
function devConfigPath(): string {
  return join(app.getAppPath(), 'dev-app-update.yml')
}

function canUpdate(): boolean {
  return app.isPackaged || existsSync(devConfigPath())
}

function setStatus(next: UpdateStatus): void {
  status = next
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IpcChannel.UpdatesStatus, next)
  }
}

/** Notas del Release como texto plano: se quitan etiquetas HTML (llegan del Release, no son de fiar). */
function notesText(info: UpdateInfo): string | undefined {
  const raw = info.releaseNotes
  const text = Array.isArray(raw) ? raw.map((n) => n.note ?? '').join('\n\n') : (raw ?? '')
  const plain = text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
  return plain || undefined
}

function installerSize(info: UpdateInfo): number {
  const file = info.files.find((f) => f.url.toLowerCase().endsWith('.exe')) ?? info.files[0]
  return file?.size ?? 0
}

function setup(): void {
  if (configured) return
  configured = true
  autoUpdater.autoDownload = false
  // Si se descargó y el usuario no reinició, se instala al cerrar.
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = log
  if (!app.isPackaged && existsSync(devConfigPath())) autoUpdater.forceDevUpdateConfig = true

  autoUpdater.on('checking-for-update', () => setStatus({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => {
    available = { version: info.version, sizeBytes: installerSize(info) }
    setStatus({
      state: 'available',
      version: info.version,
      releaseNotes: notesText(info),
      sizeBytes: available.sizeBytes
    })
  })
  autoUpdater.on('update-not-available', () => {
    available = null
    lastCheckAt = Date.now()
    setStatus({ state: 'upToDate', checkedAt: lastCheckAt })
  })
  autoUpdater.on('download-progress', (p: ProgressInfo) => {
    setStatus({
      state: 'downloading',
      version: available?.version ?? '',
      received: p.transferred,
      total: p.total,
      bytesPerSec: p.bytesPerSecond,
      etaSec: p.bytesPerSecond > 0 ? Math.ceil((p.total - p.transferred) / p.bytesPerSecond) : null
    })
  })
  autoUpdater.on('update-downloaded', (info) => {
    log.info(`Actualización ${info.version} descargada`)
    setStatus({ state: 'ready', version: info.version })
  })
  autoUpdater.on('error', (err) => {
    log.error(`Actualizador (${phase})`, err)
    setStatus({ state: 'error', code: updateErrorCode(err, phase) })
  })
}

export function getUpdateStatus(): UpdateStatus {
  return status
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  // En desarrollo no hay `app-update.yml`: se evita la llamada y el error.
  if (!canUpdate()) {
    lastCheckAt = Date.now()
    setStatus({ state: 'upToDate', checkedAt: lastCheckAt })
    return status
  }
  // No pisar una descarga en curso ni una actualización ya lista.
  if (status.state === 'checking' || status.state === 'downloading' || status.state === 'ready') {
    return status
  }
  setup()
  phase = 'check'
  lastCheckAt = Date.now()
  try {
    await autoUpdater.checkForUpdates()
  } catch {
    // El evento `error` ya dejó el estado; aquí solo se evita el rechazo sin capturar.
  }
  return status
}

export async function downloadUpdate(): Promise<UpdateStatus> {
  if (status.state !== 'available' || !available) return status
  setup()
  const needed = available.sizeBytes + DISK_MARGIN_BYTES
  try {
    if ((await freeDiskSpace(app.getPath('userData'))) < needed) {
      setStatus({ state: 'error', code: 'noDiskSpace' })
      return status
    }
  } catch (err) {
    log.warn('No se pudo medir el espacio libre; se descarga igual', err)
  }
  phase = 'download'
  setStatus({
    state: 'downloading',
    version: available.version,
    received: 0,
    total: available.sizeBytes,
    bytesPerSec: 0,
    etaSec: null
  })
  try {
    await autoUpdater.downloadUpdate()
  } catch {
    // Igual que en `checkForUpdates`: el evento `error` ya actualizó el estado.
  }
  return status
}

/**
 * Cierra e instala en silencio y reabre la app. Guardar la cola y el historial lo hace el
 * `before-quit` de `index.ts`, que `quitAndInstall` dispara al pedir el cierre.
 */
export function installUpdate(): UpdateInstallResult {
  if (status.state !== 'ready') return { ok: false, reason: 'notReady' }
  const reason = installBlocker({ transcribing: isTranscribing(), cudaJob: isCudaBusy() })
  if (reason) return { ok: false, reason }
  log.info('Reiniciando para instalar la actualización')
  autoUpdater.quitAndInstall(true, true)
  return { ok: true }
}

/** Comprobación al iniciar: unos segundos después de abrir la ventana. */
export function scheduleAutoCheck(): void {
  setTimeout(() => {
    const allowed = shouldAutoCheck({
      packaged: canUpdate(),
      autoCheck: getSettings().autoCheckUpdates,
      lastCheckAt,
      now: Date.now()
    })
    if (allowed) void checkForUpdates()
  }, AUTO_CHECK_DELAY_MS)
}

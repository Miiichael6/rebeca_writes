import { spawn } from 'child_process'
import { BrowserWindow } from 'electron'
import log from 'electron-log/main'
import { IpcChannel } from '@shared/ipc'
import type { Backend, BackendInfo } from '@shared/types'
import { BACKEND_ORDER } from '@shared/whisper'
import { readSettings, updateSettings } from '../services/settings'
import { probeFoundDevice, type FallbackEvent } from './fallback'
import { installedBackends, whisperCliPath } from './paths'

const NVIDIA_SMI_TIMEOUT_MS = 3_000
/** `--help` del build CUDA carga ~1 GB de DLL; en frío puede tardar varios segundos. */
const PROBE_TIMEOUT_MS = 20_000

interface RunResult {
  code: number | null
  output: string
}

/** Ejecuta un proceso y junta stdout + stderr. Nunca rechaza: sin exe o por timeout da code null. */
function run(file: string, args: string[], timeoutMs: number): Promise<RunResult> {
  return new Promise((resolve) => {
    let output = ''
    let settled = false
    const done = (code: number | null): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ code, output })
    }
    const child = spawn(file, args, { windowsHide: true })
    const timer = setTimeout(() => {
      child.kill()
      done(null)
    }, timeoutMs)
    child.stdout.on('data', (d: Buffer) => (output += d.toString('utf8')))
    child.stderr.on('data', (d: Buffer) => (output += d.toString('utf8')))
    child.on('error', () => done(null))
    child.on('close', (code) => done(code))
  })
}

/** `nvidia-smi -L` responde y lista al menos una GPU. */
export async function hasNvidiaGpu(): Promise<boolean> {
  const { code, output } = await run('nvidia-smi', ['-L'], NVIDIA_SMI_TIMEOUT_MS)
  return code === 0 && /^GPU \d+:/m.test(output)
}

/** Arranca whisper-cli del backend con `--help` y comprueba que carga y ve un dispositivo. */
export async function probeBackend(backend: Backend): Promise<boolean> {
  const { code, output } = await run(whisperCliPath(backend), ['--help'], PROBE_TIMEOUT_MS)
  return code === 0 && probeFoundDevice(backend, output)
}

/** Autodetección (spec §2.1): CUDA si responde nvidia-smi, si no Vulkan, si no CPU. */
export async function detectBackend(installed: readonly Backend[]): Promise<Backend> {
  if (installed.includes('cuda') && (await hasNvidiaGpu()) && (await probeBackend('cuda'))) {
    return 'cuda'
  }
  if (installed.includes('vulkan') && (await probeBackend('vulkan'))) return 'vulkan'
  return 'cpu'
}

function isBackend(value: unknown): value is Backend {
  return (BACKEND_ORDER as readonly unknown[]).includes(value)
}

async function loadBackendInfo(): Promise<BackendInfo> {
  const installed = installedBackends()
  const saved = await readSettings()

  // La detección solo corre en el primer arranque; después manda lo guardado.
  let detected = isBackend(saved.detectedBackend) ? saved.detectedBackend : null
  if (!detected) {
    const started = Date.now()
    detected = await detectBackend(installed)
    log.info(`Backend detectado: ${detected} en ${Date.now() - started} ms`)
  }
  const backend = isBackend(saved.backend) ? saved.backend : detected

  if (saved.detectedBackend !== detected || saved.backend !== backend) {
    await updateSettings({ detectedBackend: detected, backend })
  }
  log.info(`Backend: ${backend} (detectado ${detected}, instalados: ${installed.join(', ')})`)
  return { backend, detected, installed }
}

let info: Promise<BackendInfo> | null = null

/** Resuelve el backend una sola vez; las llamadas siguientes reutilizan el resultado. */
export function getBackendInfo(): Promise<BackendInfo> {
  info ??= loadBackendInfo().catch((err) => {
    info = null
    throw err
  })
  return info
}

/** Avisa al renderer para el toast "X no disponible, se usó Y". */
export function notifyFallback({ from, to, reason }: FallbackEvent): void {
  log.warn(`Fallback de backend: ${from} → ${to} (${reason})`)
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IpcChannel.BackendFallback, { from, to })
  }
}

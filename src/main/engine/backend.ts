import { spawn } from 'child_process'
import { BrowserWindow } from 'electron'
import log from 'electron-log/main'
import { IpcChannel } from '@shared/ipc'
import type { Backend, BackendInfo } from '@shared/types'
import { getSettings, loadSettings, updateSettings } from '../services/settings'
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

interface Detection {
  detected: Backend
  installed: Backend[]
}

async function detect(): Promise<Detection> {
  const installed = installedBackends()
  const saved = await loadSettings()

  // La detección solo corre en el primer arranque; después manda lo guardado. Se repite si el
  // backend guardado ya no está instalado (p. ej. se borró el paquete CUDA descargable).
  let detected = saved.detectedBackend
  if (!detected || !installed.includes(detected)) {
    const started = Date.now()
    detected = await detectBackend(installed)
    log.info(`Backend detectado: ${detected} en ${Date.now() - started} ms`)
  }
  const backend = saved.backend ?? detected

  if (saved.detectedBackend !== detected || saved.backend !== backend) {
    await updateSettings({ detectedBackend: detected, backend })
  }
  // El elegido se conserva aunque no esté instalado (vuelve a valer si se reinstala); se usa el detectado.
  const effective = installed.includes(backend) ? backend : detected
  log.info(
    `Backend: ${effective} (elegido ${backend}, detectado ${detected}, instalados: ${installed.join(', ')})`
  )
  return { detected, installed }
}

let detection: Promise<Detection> | null = null

/**
 * Backend elegido, detectado e instalados. La detección corre una sola vez; el elegido se lee
 * de settings en cada llamada, así un cambio en Configuración vale desde la siguiente
 * transcripción. Si el elegido no está instalado se usa el detectado.
 */
export async function getBackendInfo(): Promise<BackendInfo> {
  detection ??= detect().catch((err) => {
    detection = null
    throw err
  })
  const { detected, installed } = await detection
  const chosen = getSettings().backend
  const backend = chosen && installed.includes(chosen) ? chosen : detected
  return { backend, detected, installed }
}

/** Avisa al renderer para el toast "X no disponible, se usó Y". */
export function notifyFallback({ from, to, reason }: FallbackEvent): void {
  log.warn(`Fallback de backend: ${from} → ${to} (${reason})`)
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(IpcChannel.BackendFallback, { from, to })
  }
}

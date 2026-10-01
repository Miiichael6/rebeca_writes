import { spawn } from 'child_process'
import type { BackendBinaries } from '../../application/ports/backendBinaries'
import { probeFoundDevice } from '../../domain/fallback'
import { getWhisperCli, installedBackends, whisperCliPath } from './binaryPaths'

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

/** Adaptador de `BackendBinaries`: busca los exe en las raíces dadas y los ejecuta. */
export function whisperBinaries(roots: readonly string[]): BackendBinaries {
  return {
    installed: () => installedBackends(roots),
    cliPath: (backend) => getWhisperCli(backend, roots),

    async hasNvidiaGpu() {
      const { code, output } = await run('nvidia-smi', ['-L'], NVIDIA_SMI_TIMEOUT_MS)
      return code === 0 && /^GPU \d+:/m.test(output)
    },

    // `cliPath` permite probar un exe que todavía no está en su sitio (el CUDA recién descomprimido).
    async probe(backend, cliPath = whisperCliPath(backend, roots)) {
      const { code, output } = await run(cliPath, ['--help'], PROBE_TIMEOUT_MS)
      return code === 0 && probeFoundDevice(backend, output)
    }
  }
}

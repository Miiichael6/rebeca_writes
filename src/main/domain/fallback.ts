import type { Backend, BackendFallback } from '@shared/types'
import { BACKEND_ORDER } from '@shared/whisper'

// Reglas puras sobre la salida de whisper-cli (sin Electron, para poder testearlas).
//
// Los zips oficiales cargan los backends como DLL en tiempo de ejecución (GGML_BACKEND_DL). Si la
// GPU no sirve, whisper-cli NO falla: imprime "no GPU found" y sigue en CPU. Por eso no basta con
// mirar el exit code y hay que leer stderr.

export type LoadFailureReason =
  'not-installed' | 'missing-dll' | 'no-device' | 'out-of-memory' | 'crashed'

/** Un exit code distinto de 0 dentro de esta ventana, sin segmentos, cuenta como fallo de carga. */
export const LOAD_WINDOW_MS = 10_000

// NTSTATUS de Windows cuando falta una DLL o un símbolo al arrancar el exe.
const STATUS_DLL_NOT_FOUND = 0xc0000135
const STATUS_ENTRYPOINT_NOT_FOUND = 0xc0000139

const OUT_OF_MEMORY = /out of memory|ErrorOutOf(Device|Host)Memory|failed to allocate/i
const NO_DEVICE =
  /no GPU found|failed to initialize CUDA|no CUDA-capable device|Found 0 Vulkan devices/i
/** Errores del modelo o del audio: son del archivo, no del backend; reintentar no sirve. */
const INPUT_ERROR = /failed to open '|input file not found|failed to read|invalid model/i

export interface LoadAttempt {
  backend: Backend
  /** stderr acumulado hasta ahora (puede llamarse con el proceso aún vivo). */
  stderr: string
  /** `null` mientras el proceso sigue vivo o si lo mató una señal. */
  exitCode: number | null
  elapsedMs: number
  /** Ya salió al menos un segmento: desde ahí cualquier fallo es de la transcripción. */
  producedSegments: boolean
}

/** ¿El backend falló al cargar y conviene reintentar con el siguiente? */
export function detectLoadFailure(a: LoadAttempt): LoadFailureReason | null {
  if (a.producedSegments) return null
  const code = a.exitCode === null ? null : a.exitCode >>> 0
  if (code === STATUS_DLL_NOT_FOUND || code === STATUS_ENTRYPOINT_NOT_FOUND) return 'missing-dll'
  if (OUT_OF_MEMORY.test(a.stderr)) return 'out-of-memory'
  if (a.backend !== 'cpu' && NO_DEVICE.test(a.stderr)) return 'no-device'
  if (code !== null && code !== 0 && a.elapsedMs < LOAD_WINDOW_MS && !INPUT_ERROR.test(a.stderr)) {
    return 'crashed'
  }
  return null
}

/**
 * ¿La salida de `whisper-cli --help` muestra un dispositivo usable para el backend? `--help` ya
 * carga las DLL de backend y enumera los dispositivos, sin necesitar un modelo.
 */
export function probeFoundDevice(backend: Backend, output: string): boolean {
  switch (backend) {
    case 'cuda': {
      const m = /ggml_cuda_init: found (\d+) CUDA devices/.exec(output)
      return m !== null && Number(m[1]) > 0
    }
    case 'vulkan': {
      const m = /Found (\d+) Vulkan devices/i.exec(output)
      return m !== null && Number(m[1]) > 0 && /loaded Vulkan backend/i.test(output)
    }
    case 'cpu':
      return /loaded CPU backend/i.test(output)
  }
}

export class BackendNotInstalledError extends Error {
  constructor(readonly backend: Backend) {
    super(`whisper-cli no está instalado para el backend ${backend}`)
    this.name = 'BackendNotInstalledError'
  }
}

/** Lo lanza el intento de transcripción cuando `detectLoadFailure` da un motivo. */
export class BackendLoadError extends Error {
  constructor(
    readonly backend: Backend,
    readonly reason: LoadFailureReason
  ) {
    super(`El backend ${backend} falló al cargar (${reason})`)
    this.name = 'BackendLoadError'
  }
}

export interface FallbackEvent extends BackendFallback {
  reason: LoadFailureReason
}

/** Backends a probar desde `start` hacia abajo (CUDA → Vulkan → CPU), solo los instalados. */
export function fallbackChain(start: Backend, installed: readonly Backend[]): Backend[] {
  return BACKEND_ORDER.slice(BACKEND_ORDER.indexOf(start)).filter((b) => installed.includes(b))
}

/**
 * Ejecuta `attempt` con `start` y, si lanza `BackendLoadError`, reintenta con el siguiente backend
 * instalado avisando por `onFallback`. Cualquier otro error se propaga sin reintentar.
 */
export async function withBackendFallback<T>(
  start: Backend,
  installed: readonly Backend[],
  attempt: (backend: Backend) => Promise<T>,
  onFallback?: (event: FallbackEvent) => void
): Promise<{ result: T; backend: Backend }> {
  const chain = fallbackChain(start, installed)
  if (chain.length === 0) throw new BackendNotInstalledError(start)
  if (chain[0] !== start) onFallback?.({ from: start, to: chain[0], reason: 'not-installed' })

  for (let i = 0; ; i++) {
    const backend = chain[i]
    try {
      return { result: await attempt(backend), backend }
    } catch (err) {
      const next = chain[i + 1]
      if (!(err instanceof BackendLoadError) || !next) throw err
      onFallback?.({ from: backend, to: next, reason: err.reason })
    }
  }
}

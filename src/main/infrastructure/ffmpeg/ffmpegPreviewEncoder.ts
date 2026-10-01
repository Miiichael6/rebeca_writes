import { spawn } from 'child_process'
import { constants as osConstants, setPriority } from 'os'
import type { PreviewEncoder } from '../../application/ports/previewEncoder'
import { createProgressParser } from '../../domain/media'
import { lastLines } from '../../domain/text'
import { ffmpegPath } from './ffmpegTools'

export class PreviewEncodeError extends Error {
  constructor(readonly detail: string) {
    super(detail)
    this.name = 'PreviewEncodeError'
  }
}

/** Baja la prioridad para que la vista previa no le quite CPU a la transcripción. */
function lowerPriority(pid: number | undefined): void {
  if (pid === undefined) return
  try {
    setPriority(pid, osConstants.priority.PRIORITY_BELOW_NORMAL)
  } catch {
    // Si el sistema no deja cambiarla, se genera igual con prioridad normal.
  }
}

/** Adaptador de `PreviewEncoder`: ffmpeg con prioridad baja, cancelable con `signal`. */
export const ffmpegPreviewEncoder: PreviewEncoder = {
  run(args, durationSec, onProgress, signal) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(signal.reason)
      const child = spawn(ffmpegPath(), args, { windowsHide: true })
      lowerPriority(child.pid)
      const onAbort = (): void => void child.kill()
      signal.addEventListener('abort', onAbort, { once: true })

      const parse = createProgressParser(durationSec, onProgress)
      let stderr = ''
      child.stdout.on('data', (d: Buffer) => parse(d.toString('utf8')))
      child.stderr.on('data', (d: Buffer) => (stderr += d.toString('utf8')))
      child.on('error', (err) => {
        signal.removeEventListener('abort', onAbort)
        reject(err)
      })
      // Se espera a `close` para que Windows suelte el `.part` antes de renombrarlo o borrarlo.
      child.on('close', (code, exitSignal) => {
        signal.removeEventListener('abort', onAbort)
        if (signal.aborted) reject(signal.reason)
        else if (code === 0) resolve()
        else {
          const detail = exitSignal ? `ffmpeg terminado (${exitSignal})` : lastLines(stderr)
          reject(new PreviewEncodeError(detail || 'ffmpeg falló'))
        }
      })
    })
  }
}

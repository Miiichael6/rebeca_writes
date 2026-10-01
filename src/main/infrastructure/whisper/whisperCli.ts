import { spawn } from 'child_process'
import type { Segment } from '@shared/types'
import type {
  WhisperProcess,
  WhisperRequest,
  WhisperResult
} from '../../application/ports/whisperProcess'
import { BackendLoadError, detectLoadFailure } from '../../domain/fallback'
import {
  LineSplitter,
  parseDetectedLanguage,
  parseProgress,
  parseSegmentLine
} from '../../domain/parsers'
import { lastLines } from '../../domain/text'
import { TranscribeError } from '../../domain/transcribeError'

/** `taskkill /T /F` en Windows para no dejar procesos hijos huérfanos; `kill` en el resto. */
function killTree(pid: number): void {
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true })
  } else {
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      // Ya había terminado.
    }
  }
}

/** Ejecuta whisper-cli y resuelve con los segmentos, avisando de `segment` y progreso en vivo. */
function runWhisper(request: WhisperRequest, signal: AbortSignal): Promise<WhisperResult> {
  const { backend, cli, args, onSegment, onProgress } = request
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new TranscribeError('cancelled'))
      return
    }
    const started = Date.now()
    const segments: Segment[] = []
    let detectedLanguage: string | null = null
    let stderrBuf = ''
    let producedSegments = false

    const child = spawn(cli, args, { windowsHide: true })
    const onAbort = (): void => {
      if (child.pid) killTree(child.pid)
    }
    signal.addEventListener('abort', onAbort, { once: true })

    const outSplitter = new LineSplitter((line) => {
      const segment = parseSegmentLine(line)
      if (!segment) return
      segments.push(segment)
      producedSegments = true
      onSegment(segment)
    })
    const errSplitter = new LineSplitter((line) => {
      stderrBuf += line + '\n'
      const percent = parseProgress(line)
      if (percent !== null) onProgress(percent)
      detectedLanguage ??= parseDetectedLanguage(line)
    })

    child.stdout.on('data', (d: Buffer) => outSplitter.push(d))
    child.stderr.on('data', (d: Buffer) => errSplitter.push(d))
    child.on('error', (err) => {
      signal.removeEventListener('abort', onAbort)
      reject(err)
    })
    child.on('close', (code) => {
      signal.removeEventListener('abort', onAbort)
      outSplitter.flush()
      errSplitter.flush()

      if (signal.aborted) {
        reject(new TranscribeError('cancelled'))
        return
      }
      const reason = detectLoadFailure({
        backend,
        stderr: stderrBuf,
        exitCode: code,
        elapsedMs: Date.now() - started,
        producedSegments
      })
      if (reason) {
        reject(new BackendLoadError(backend, reason))
        return
      }
      if (code !== 0) {
        reject(new TranscribeError('backendFailed', lastLines(stderrBuf)))
        return
      }
      resolve({ segments, detectedLanguage })
    })
  })
}

/** Adaptador de `WhisperProcess` sobre `child_process`. */
export const whisperCli: WhisperProcess = { run: runWhisper }

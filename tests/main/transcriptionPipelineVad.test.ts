import { describe, expect, it, vi } from 'vitest'
import type { BackendService } from '../../src/main/application/backendService'
import type { ModelService } from '../../src/main/application/modelService'
import type { WhisperRequest } from '../../src/main/application/ports/whisperProcess'
import { TranscriptionPipeline } from '../../src/main/application/transcriptionPipeline'
import type { TranscribeJob } from '../../src/shared/types'

const job: TranscribeJob = {
  id: 'j1',
  filePath: 'a.mp4',
  model: 'small',
  language: 'es',
  options: { vad: true }
}

/** Pipeline con dobles: devuelve los argumentos con los que se lanzó whisper. */
async function argsWith(
  vadPath: string | null,
  options = job.options,
  downloaded: string | null = null
): Promise<string[]> {
  let path = vadPath
  const requests: WhisperRequest[] = []
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  const pipeline = new TranscriptionPipeline({
    media: {
      probe: async () => ({ durationSec: 10 }) as never,
      toWav: async () => 'a.wav'
    },
    temp: { dir: () => 'tmp', remove: async () => {} },
    whisper: {
      run: async (request) => {
        requests.push(request)
        return { segments: [], detectedLanguage: null }
      }
    },
    binaries: {
      installed: () => ['cpu'],
      cliPath: () => 'whisper-cli.exe',
      hasNvidiaGpu: async () => false,
      probe: async () => true
    },
    backends: {
      info: async () => ({ backend: 'cpu', installed: ['cpu'] }),
      acquire: () => () => {},
      notifyFallback: () => {}
    } as unknown as BackendService,
    models: {
      resolvePath: async () => 'model.bin',
      acquire: () => () => {}
    } as unknown as ModelService,
    vadModel: {
      readyPath: async () => path,
      prepare: async () => {
        path = downloaded
        return downloaded
          ? { status: 'done' as const }
          : { status: 'error' as const, code: 'downloadFailed' as const }
      }
    },
    log
  })
  const errors: unknown[] = []
  pipeline.on('error', (e) => errors.push(e))
  await pipeline.start({ ...job, options })
  expect(errors).toEqual([])
  return requests[0].args
}

describe('TranscriptionPipeline · filtro de voz', () => {
  it('pasa el modelo de VAD si el ajuste está activo y el modelo existe', async () => {
    const args = await argsWith('C:\\vad\\silero.bin')
    expect(args).toContain('--vad')
    expect(args).toContain('C:\\vad\\silero.bin')
  })

  it('si falta el modelo lo descarga y lo usa', async () => {
    expect(await argsWith(null, job.options, 'C:\\vad\\silero.bin')).toContain('--vad')
  })

  it('si la descarga falla transcribe igual, sin VAD', async () => {
    expect(await argsWith(null)).not.toContain('--vad')
  })

  it('con el ajuste apagado no usa el filtro aunque el modelo exista', async () => {
    expect(await argsWith('C:\\vad\\silero.bin', { vad: false })).not.toContain('--vad')
  })
})

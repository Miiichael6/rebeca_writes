import { vi } from 'vitest'
import type { BackendService } from '../../src/main/application/backendService'
import type { ModelService } from '../../src/main/application/modelService'
import type { WhisperRequest, WhisperResult } from '../../src/main/application/ports/whisperProcess'
import {
  TranscriptionPipeline,
  type TranscriptionPipelineDeps
} from '../../src/main/application/transcriptionPipeline'

/** Dobles del pipeline: whisper responde con `result` y anota con qué se lanzó. */
export function fakePipeline(
  overrides: Partial<TranscriptionPipelineDeps> = {},
  result: WhisperResult = { segments: [], detectedLanguage: null }
): { pipeline: TranscriptionPipeline; requests: WhisperRequest[] } {
  const requests: WhisperRequest[] = []
  const pipeline = new TranscriptionPipeline({
    media: {
      probe: async () => ({ durationSec: 10 }) as never,
      toWav: async () => 'a.wav'
    },
    temp: { dir: () => 'tmp', remove: async () => {} },
    whisper: {
      run: async (request) => {
        requests.push(request)
        for (const segment of result.segments) request.onSegment(segment)
        return result
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
    vadModel: { readyPath: async () => null, prepare: async () => null as never },
    dictionary: { active: async () => [] },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...overrides
  })
  return { pipeline, requests }
}

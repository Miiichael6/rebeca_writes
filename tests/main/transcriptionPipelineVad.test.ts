import { describe, expect, it } from 'vitest'
import type { TranscribeJob } from '../../src/shared/types'
import { fakePipeline } from './pipelineFixture'

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
  const { pipeline, requests } = fakePipeline({
    vadModel: {
      readyPath: async () => path,
      prepare: async () => {
        path = downloaded
        return downloaded
          ? { status: 'done' as const }
          : { status: 'error' as const, code: 'downloadFailed' as const }
      }
    }
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

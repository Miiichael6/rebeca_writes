import { describe, expect, it } from 'vitest'
import type { DictionaryEntry } from '../../src/shared/dictionary'
import type { Segment, TranscribeJob } from '../../src/shared/types'
import { fakePipeline } from './pipelineFixture'

const job: TranscribeJob = {
  id: 'j1',
  filePath: 'a.mp4',
  model: 'small',
  language: 'es',
  options: { prompt: 'Reunión.' }
}

const qa: DictionaryEntry = {
  id: 'qa',
  spoken: ['cua'],
  written: 'QA',
  plural: false,
  enabled: true
}
const whisperSegments: Segment[] = [{ start: 0, end: 1, text: 'pásalo a cua' }]

interface Outcome {
  streamed: Segment[]
  done: Segment[]
  prompt: string
}

/** Corre el pipeline con el diccionario dado y devuelve lo que salió. */
async function run(dictionary: () => Promise<DictionaryEntry[]>): Promise<Outcome> {
  const { pipeline, requests } = fakePipeline(
    { dictionary: { active: dictionary } },
    { segments: whisperSegments, detectedLanguage: null }
  )
  const streamed: Segment[] = []
  const done: Segment[] = []
  pipeline.on('segment', (e) => streamed.push(...e.segments))
  pipeline.on('done', (e) => done.push(...e.segments))
  await pipeline.start(job)
  const args = requests[0].args
  return { streamed, done, prompt: args[args.indexOf('--prompt') + 1] }
}

describe('TranscriptionPipeline · diccionario', () => {
  it('añade sus palabras al --prompt y corrige los segmentos en vivo y al final', async () => {
    const { streamed, done, prompt } = await run(async () => [qa])
    expect(prompt).toBe('Reunión. QA')
    const corrected = { start: 0, end: 1, text: 'pásalo a QA', originalText: 'pásalo a cua' }
    expect(streamed).toEqual([corrected])
    expect(done).toEqual([corrected])
  })

  it('apagado deja el --prompt y los segmentos como los da whisper', async () => {
    const { streamed, done, prompt } = await run(async () => [])
    expect(prompt).toBe('Reunión.')
    expect(streamed).toEqual(whisperSegments)
    expect(done).toEqual(whisperSegments)
  })

  it('si no se puede leer transcribe igual, sin diccionario', async () => {
    const { done } = await run(() => Promise.reject(new Error('EACCES')))
    expect(done).toEqual(whisperSegments)
  })
})

import { describe, expect, it } from 'vitest'
import { OWN_SPEAKER_ID } from '@shared/speakers'
import type { HistoryEntry, Segment } from '@shared/types'
import { restoreEntry } from '../../src/main/domain/history'
import { dominantSpeaker } from '../../src/main/domain/speakers/alignSpeakers'
import {
  assignSpeaker,
  cosineSimilarity,
  SAME_SPEAKER_THRESHOLD,
  type SpeakerCluster
} from '../../src/main/domain/speakers/clusterSpeakers'
import { OwnVoiceTimeline } from '../../src/main/domain/speakers/ownVoiceTimeline'
import { renamedSpeakers } from '../../src/main/domain/speakers/speakerNames'
import { parseSpeakerEvent } from '../../src/main/domain/speakers/speakerProtocol'
import type { SpeakerEmbedder } from '../../src/main/application/ports/speakerEmbedder'
import { MIN_EMBED_SEC, SpeakerLabeler } from '../../src/main/application/speakerLabeler'

/** Huellas de juguete: dos voces casi ortogonales con un poco de ruido. */
const VOICE_A = [1, 0, 0]
const VOICE_B = [0, 1, 0]
const jitter = (v: number[], amount: number): number[] => v.map((x, i) => x + amount * (i + 1))

function label(embeddings: number[][], threshold?: number): string[] {
  let clusters: SpeakerCluster[] = []
  return embeddings.map((embedding) => {
    const result = assignSpeaker(embedding, clusters, threshold)
    clusters = result.clusters
    return result.id
  })
}

describe('assignSpeaker', () => {
  it('separa dos voces alternadas y las mantiene', () => {
    const ids = label([
      VOICE_A,
      jitter(VOICE_B, 0.05),
      jitter(VOICE_A, 0.1),
      VOICE_B,
      jitter(VOICE_A, -0.05)
    ])
    expect(ids).toEqual(['p1', 'p2', 'p1', 'p2', 'p1'])
  })

  it('una voz sola es siempre la misma persona', () => {
    expect(label([VOICE_A, jitter(VOICE_A, 0.1), jitter(VOICE_A, 0.2)])).toEqual(['p1', 'p1', 'p1'])
  })

  it('numera por orden de llegada', () => {
    expect(label([VOICE_B, VOICE_A])).toEqual(['p1', 'p2'])
  })

  it('en el umbral exacto es la misma persona; justo debajo, otra', () => {
    const angle = Math.acos(SAME_SPEAKER_THRESHOLD)
    const atThreshold = [Math.cos(angle), Math.sin(angle), 0]
    expect(cosineSimilarity(VOICE_A, atThreshold)).toBeCloseTo(SAME_SPEAKER_THRESHOLD)
    expect(label([VOICE_A, atThreshold], SAME_SPEAKER_THRESHOLD - 1e-9)).toEqual(['p1', 'p1'])
    expect(label([VOICE_A, atThreshold], SAME_SPEAKER_THRESHOLD + 1e-9)).toEqual(['p1', 'p2'])
  })

  it('no modifica las personas que recibe', () => {
    const first = assignSpeaker(VOICE_A, [])
    const before = structuredClone(first.clusters)
    assignSpeaker(VOICE_A, first.clusters)
    expect(first.clusters).toEqual(before)
  })
})

describe('dominantSpeaker', () => {
  const turns = [
    { start: 0, end: 2, speaker: 'you' },
    { start: 5, end: 6, speaker: 'you' }
  ]

  it('se queda con el hablante que cubre la mayor parte', () => {
    expect(dominantSpeaker(turns, 0.5, 2.5)).toBe('you')
  })

  it('no asigna si cubre menos de la parte mínima', () => {
    expect(dominantSpeaker(turns, 1.5, 4)).toBeNull()
  })

  it('en silencio (sin turnos) o con un segmento vacío no hay hablante', () => {
    expect(dominantSpeaker([], 0, 3)).toBeNull()
    expect(dominantSpeaker(turns, 1, 1)).toBeNull()
  })
})

describe('OwnVoiceTimeline', () => {
  const RATE = 100
  const block = (value: number): Float32Array => new Float32Array(RATE / 10).fill(value)
  const SILENCE = block(0)
  const LOUD = block(0.5)
  const ECHO = block(0.05)

  it('marca los tramos en que el micrófono domina y une pausas cortas', () => {
    const timeline = new OwnVoiceTimeline(RATE, 1)
    timeline.push(SILENCE, LOUD) // 0.0–0.1 propio
    timeline.push(SILENCE, SILENCE) // pausa corta
    timeline.push(SILENCE, LOUD) // 0.2–0.3 propio
    for (let i = 0; i < 10; i++) timeline.push(SILENCE, SILENCE)
    timeline.push(SILENCE, LOUD) // 1.3–1.4 propio, turno nuevo
    const turns = timeline.turns()
    expect(turns).toHaveLength(2)
    expect(turns[0].start).toBeCloseTo(0)
    expect(turns[0].end).toBeCloseTo(0.3)
    expect(turns[1].start).toBeCloseTo(1.3)
  })

  it('el eco de los altavoces no cuenta como voz propia', () => {
    const timeline = new OwnVoiceTimeline(RATE, 1)
    timeline.push(LOUD, ECHO)
    timeline.push(LOUD, LOUD)
    expect(timeline.turns()).toEqual([])
  })
})

describe('restoreEntry y los hablantes', () => {
  const base: HistoryEntry = {
    id: 'a',
    filePath: 'x.mp3',
    fileName: 'x.mp3',
    durationSec: 1,
    model: 'base',
    language: 'es',
    createdAt: 1,
    status: 'done'
  }

  it('una entrada antigua sin hablantes queda igual', () => {
    expect(restoreEntry(base)).toEqual(base)
  })

  it('conserva los nombres válidos y descarta un mapa dañado', () => {
    expect(restoreEntry({ ...base, speakers: { p1: 'Ana' } }).speakers).toEqual({ p1: 'Ana' })
    const broken = { ...base, speakers: { p1: 3 } } as unknown as HistoryEntry
    expect(restoreEntry(broken).speakers).toBeUndefined()
  })
})

describe('parseSpeakerEvent', () => {
  it('lee los eventos del sidecar', () => {
    expect(parseSpeakerEvent('{"type":"loaded","dim":192}')).toEqual({ type: 'loaded', dim: 192 })
    expect(parseSpeakerEvent('{"type":"embedding","id":3,"vector":[0.5,-1]}')).toEqual({
      type: 'embedding',
      id: 3,
      vector: [0.5, -1]
    })
    expect(parseSpeakerEvent('{"type":"embed_failed","id":3,"message":"corto"}')).toEqual({
      type: 'embedFailed',
      id: 3,
      message: 'corto'
    })
    expect(parseSpeakerEvent('{"type":"load_failed","message":"no está"}')).toEqual({
      type: 'loadFailed',
      message: 'no está'
    })
  })

  it('descarta líneas rotas o con la forma equivocada', () => {
    expect(parseSpeakerEvent('no es json')).toBeNull()
    expect(parseSpeakerEvent('{"type":"embedding","id":3,"vector":["x"]}')).toBeNull()
    expect(parseSpeakerEvent('{"type":"otro"}')).toBeNull()
  })
})

describe('SpeakerLabeler', () => {
  const seg = (start: number, end: number, text = 'hola'): Segment => ({ start, end, text })
  /** Extractor falso: la huella sale de una tabla por segundo de inicio. */
  const embedderOf = (byStart: Record<number, number[] | null>): SpeakerEmbedder => ({
    embed: async (_wav, start) => byStart[start] ?? null,
    release: () => {}
  })

  it('agrupa por voz y numera por orden de aparición', async () => {
    const labeler = new SpeakerLabeler(embedderOf({ 0: VOICE_A, 2: VOICE_B, 4: VOICE_A }), null)
    const labeled = await labeler.label('w.wav', [seg(0, 2), seg(2, 4), seg(4, 6)], 0)
    expect(labeled.map((s) => s.speaker)).toEqual(['p1', 'p2', 'p1'])
  })

  it('un tramo corto o sin huella hereda el hablante anterior; el vacío queda sin él', async () => {
    const labeler = new SpeakerLabeler(embedderOf({ 0: VOICE_A }), null)
    const labeled = await labeler.label(
      'w.wav',
      [seg(0, 2), seg(2, 2 + MIN_EMBED_SEC / 2), seg(3, 5), seg(5, 6, ' ')],
      0
    )
    expect(labeled.map((s) => s.speaker)).toEqual(['p1', 'p1', 'p1', undefined])
  })

  it('la voz propia gana a la huella, con los tiempos de la ventana desplazados', async () => {
    const ownVoice = { turns: () => [{ start: 10, end: 12, speaker: OWN_SPEAKER_ID }] }
    const labeler = new SpeakerLabeler(embedderOf({ 0: VOICE_A, 2: VOICE_B }), ownVoice)
    const labeled = await labeler.label('w.wav', [seg(0, 2), seg(2, 4)], 10)
    expect(labeled.map((s) => s.speaker)).toEqual([OWN_SPEAKER_ID, 'p1'])
  })
})

describe('renamedSpeakers', () => {
  it('pone, recorta y quita nombres', () => {
    expect(renamedSpeakers(undefined, 'p1', '  Ana  ', 60)).toEqual({ p1: 'Ana' })
    expect(renamedSpeakers({ p1: 'Ana' }, 'p2', 'Luis', 60)).toEqual({ p1: 'Ana', p2: 'Luis' })
    expect(renamedSpeakers({ p1: 'Ana' }, 'p1', 'Alejandra', 3)).toEqual({ p1: 'Ale' })
    expect(renamedSpeakers({ p1: 'Ana' }, 'p1', '   ', 60)).toBeUndefined()
  })

  it('un id inválido no cambia nada', () => {
    expect(renamedSpeakers({ p1: 'Ana' }, '../x', 'Luis', 60)).toEqual({ p1: 'Ana' })
    expect(renamedSpeakers(undefined, '', 'Luis', 60)).toBeUndefined()
  })
})

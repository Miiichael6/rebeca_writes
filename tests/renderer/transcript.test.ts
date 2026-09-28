import { beforeEach, describe, expect, it } from 'vitest'
import type { HistoryEntry } from '@shared/types'
import {
  appendJobSegments,
  applySegmentEdit,
  beginJob,
  finishJob,
  updateJobProgress,
  useTranscriptStore
} from '../../src/renderer/src/store/transcript'

function entry(id: string, status: HistoryEntry['status'] = 'pending'): HistoryEntry {
  return {
    id,
    filePath: `C:\\v\\${id}.mp4`,
    fileName: `${id}.mp4`,
    durationSec: 60,
    model: 'small',
    language: 'auto',
    createdAt: 0,
    status
  }
}

const seg = (start: number): { start: number; end: number; text: string } => ({
  start,
  end: start + 1,
  text: `s${start}`
})

const state = (): ReturnType<typeof useTranscriptStore.getState> => useTranscriptStore.getState()

beforeEach(() => {
  useTranscriptStore.setState({ job: null })
  state().open(null)
})

describe('transcript store', () => {
  it('una entrada pendiente queda lista para transcribir', () => {
    state().open(entry('a'))
    expect(state()).toMatchObject({ status: 'ready', segments: [] })
  })

  it('una entrada cortada a mitad (sin trabajo vivo) se puede volver a lanzar', () => {
    state().open(entry('a', 'transcribing'))
    expect(state().status).toBe('ready')
  })

  it('los segmentos llegan por lotes y se acumulan en orden', () => {
    state().open(entry('a'))
    beginJob('job1', 'a')
    expect(state().status).toBe('transcribing')
    appendJobSegments('job1', [seg(0), seg(1)])
    appendJobSegments('job1', [seg(2)])
    expect(state().segments.map((s) => s.start)).toEqual([0, 1, 2])
    expect(state().segments).toBe(state().job?.segments)
  })

  it('ignora eventos de otros trabajos', () => {
    state().open(entry('a'))
    beginJob('job1', 'a')
    appendJobSegments('otro', [seg(0)])
    updateJobProgress('otro', 'transcribing', 50, null)
    expect(state().segments).toEqual([])
    expect(state().job?.progress).toBe(0)
  })

  it('al cambiar de archivo durante la transcripción, el trabajo sigue y se recupera al volver', () => {
    state().open(entry('a'))
    beginJob('job1', 'a')
    appendJobSegments('job1', [seg(0)])

    state().open(entry('b'))
    expect(state()).toMatchObject({ status: 'ready', segments: [] })
    appendJobSegments('job1', [seg(1)])
    updateJobProgress('job1', 'transcribing', 40, 30)
    expect(state().segments).toEqual([])

    state().open(entry('a', 'transcribing'))
    expect(state().status).toBe('transcribing')
    expect(state().segments.map((s) => s.start)).toEqual([0, 1])
    expect(state().job).toMatchObject({ progress: 40, etaSec: 30 })
  })

  it('al terminar muestra el resultado completo y lo recuerda en la sesión', () => {
    state().open(entry('a'))
    beginJob('job1', 'a')
    appendJobSegments('job1', [seg(0)])
    finishJob('job1', { segments: [seg(0), seg(1)], error: null })
    expect(state()).toMatchObject({ status: 'done', job: null })
    expect(state().segments).toHaveLength(2)

    state().open(entry('b'))
    state().open(entry('a', 'done'))
    expect(state().segments).toHaveLength(2)
  })

  it('cancelar conserva lo transcrito y permite volver a lanzar', () => {
    state().open(entry('a'))
    beginJob('job1', 'a')
    appendJobSegments('job1', [seg(0)])
    finishJob('job1', { segments: state().segments, error: null, cancelled: true })
    expect(state()).toMatchObject({ status: 'ready', error: null, job: null })
    expect(state().segments).toHaveLength(1)
  })

  it('un error deja el código para el aviso', () => {
    state().open(entry('a'))
    beginJob('job1', 'a')
    finishJob('job1', { segments: [], error: 'modelMissing' })
    expect(state()).toMatchObject({ status: 'error', error: 'modelMissing' })
  })

  it('10 000 segmentos en lotes de 20 se acumulan rápido', () => {
    state().open(entry('big'))
    beginJob('job1', 'big')
    const startedAt = performance.now()
    for (let i = 0; i < 10_000; i += 20) {
      appendJobSegments(
        'job1',
        Array.from({ length: 20 }, (_, j) => seg(i + j))
      )
    }
    expect(state().segments).toHaveLength(10_000)
    expect(performance.now() - startedAt).toBeLessThan(500)
  })

  it('edita un segmento sin mutar el array y lo conserva al volver al archivo', () => {
    const a = entry('a')
    state().open(a)
    beginJob('job1', 'a')
    appendJobSegments('job1', [seg(0), seg(1)])
    // Mientras se transcribe ese archivo no se edita.
    expect(applySegmentEdit(0, 'x')).toBeNull()
    finishJob('job1', { segments: [seg(0), seg(1)], error: null })
    const before = state().segments
    expect(applySegmentEdit(1, 'uno')).toBe('a')
    expect(state().segments).not.toBe(before)
    expect(state().segments[1]).toEqual({
      ...seg(1),
      text: 'uno',
      edited: true,
      originalText: 's1'
    })
    expect(state().segments[0]).toBe(before[0])
    state().open(entry('b'))
    state().open(a)
    expect(state().segments[1].text).toBe('uno')
    // Volver al texto original quita las marcas.
    applySegmentEdit(1, 's1')
    expect(state().segments[1]).toEqual(seg(1))
    expect(applySegmentEdit(1, 's1')).toBeNull()
    expect(applySegmentEdit(9, 'x')).toBeNull()
  })
})

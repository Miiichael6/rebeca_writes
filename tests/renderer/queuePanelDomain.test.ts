import { describe, expect, it } from 'vitest'
import type { QueueJob } from '@shared/types'
import {
  describeJob,
  isDropTarget,
  neighborId,
  queueStats,
  reorderKeyDelta
} from '@renderer/components/QueuePanel/domain/jobs'

const job = (id: string, status: QueueJob['status'], extra: Partial<QueueJob> = {}): QueueJob =>
  ({ id, status, model: 'base', language: 'es', translate: false, ...extra }) as QueueJob

describe('queueStats', () => {
  it('cuenta pendientes y detecta proceso y terminados', () => {
    const s = queueStats([job('a', 'processing'), job('b', 'pending'), job('c', 'pending')])
    expect(s).toEqual({ processing: true, pendingCount: 2, finished: false })
    expect(queueStats([job('a', 'done')])).toEqual({
      processing: false,
      pendingCount: 0,
      finished: true
    })
    expect(queueStats([]).finished).toBe(false)
  })
})

describe('describeJob', () => {
  const options = {
    modelLabels: new Map([['base', 'Base']]),
    languageName: (tag: string): string | undefined => (tag === 'es' ? 'Español' : undefined),
    autoLabel: 'Auto',
    translatedLabel: 'Traducido'
  }
  it('une modelo, idioma y traducción', () => {
    expect(describeJob(job('a', 'pending', { translate: true }), options)).toBe(
      'Base · Español · Traducido'
    )
  })
  it('usa el id del modelo y el código del idioma si no se conocen', () => {
    expect(describeJob(job('a', 'pending', { model: 'x', language: 'zz' }), options)).toBe('x · zz')
  })
})

describe('reordenar', () => {
  it('reorderKeyDelta exige Alt, pendiente y una flecha vertical', () => {
    expect(reorderKeyDelta('ArrowUp', true, true)).toBe(-1)
    expect(reorderKeyDelta('ArrowDown', true, true)).toBe(1)
    expect(reorderKeyDelta('ArrowDown', false, true)).toBe(0)
    expect(reorderKeyDelta('ArrowDown', true, false)).toBe(0)
    expect(reorderKeyDelta('a', true, true)).toBe(0)
  })

  it('neighborId no se sale de la lista', () => {
    const jobs = [job('a', 'pending'), job('b', 'pending')]
    expect(neighborId(jobs, 'a', 1)).toBe('b')
    expect(neighborId(jobs, 'a', -1)).toBeUndefined()
    expect(neighborId(jobs, 'zz', 1)).toBeUndefined()
  })

  it('isDropTarget ignora la propia fila arrastrada', () => {
    expect(isDropTarget('b', 'a', 'b')).toBe(true)
    expect(isDropTarget('a', 'a', 'a')).toBe(false)
    expect(isDropTarget('b', null, 'b')).toBe(false)
  })
})

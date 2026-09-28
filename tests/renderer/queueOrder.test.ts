import { describe, expect, it } from 'vitest'
import type { JobStatus, QueueJob } from '@shared/types'
import { moveJob } from '@renderer/lib/queueOrder'

const job = (id: string, status: JobStatus = 'pending'): QueueJob => ({
  id,
  filePath: `${id}.mp4`,
  fileName: `${id}.mp4`,
  model: 'small',
  language: 'es',
  translate: false,
  status,
  addedAt: 0
})

describe('moveJob', () => {
  const jobs = [job('a', 'done'), job('b', 'processing'), job('c'), job('d'), job('e')]

  it('baja un pendiente a la posición del destino', () => {
    expect(moveJob(jobs, 'c', 'e')).toEqual(['a', 'b', 'd', 'e', 'c'])
  })

  it('sube un pendiente a la posición del destino', () => {
    expect(moveJob(jobs, 'e', 'c')).toEqual(['a', 'b', 'e', 'c', 'd'])
  })

  it('solo mueve entre pendientes', () => {
    expect(moveJob(jobs, 'c', 'b')).toBeNull()
    expect(moveJob(jobs, 'a', 'c')).toBeNull()
    expect(moveJob(jobs, 'c', 'c')).toBeNull()
    expect(moveJob(jobs, 'x', 'c')).toBeNull()
  })
})

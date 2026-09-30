import { useState } from 'react'
import type { QueueJob } from '@shared/types'
import { moveJob } from '@renderer/lib/queueOrder'
import { neighborId } from '../domain/jobs'
import { usePorts } from './ports'

export interface JobReorder {
  dragId: string | null
  overId: string | null
  /** Mueve un trabajo una posición con el teclado. */
  moveBy: (id: string, delta: -1 | 1) => void
  startDrag: (id: string) => void
  overRow: (id: string) => void
  leaveList: () => void
  endDrag: () => void
  dropOn: (id: string) => void
}

/** Reordenar trabajos pendientes, arrastrando o con el teclado. */
export function useJobReorder(jobs: QueueJob[]): JobReorder {
  const { queue } = usePorts()
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const move = (id: string, targetId: string | undefined): void => {
    const ids = targetId ? moveJob(jobs, id, targetId) : null
    if (ids) queue.reorder(ids)
  }
  const endDrag = (): void => {
    setDragId(null)
    setOverId(null)
  }

  return {
    dragId,
    overId,
    moveBy: (id, delta) => move(id, neighborId(jobs, id, delta)),
    startDrag: setDragId,
    overRow: setOverId,
    leaveList: () => setOverId(null),
    endDrag,
    dropOn: (id) => {
      if (dragId) move(dragId, id)
      endDrag()
    }
  }
}

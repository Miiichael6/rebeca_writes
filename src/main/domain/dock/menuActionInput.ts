import type { DockMenuAction } from '@shared/dock'
import { RECORDING_SOURCES, type RecordingSource } from '@shared/recording'

const SIMPLE_KINDS = ['open', 'stop', 'quit', 'close'] as const

/**
 * Valida lo que llega del menú del dock por IPC. Lo que no se entiende cuenta como cerrar el
 * menú: nunca graba ni sale por un mensaje mal formado.
 */
export function toDockMenuAction(value: unknown): DockMenuAction {
  if (typeof value !== 'object' || value === null) return { kind: 'close' }
  const { kind, source, name } = value as Record<string, unknown>
  if (kind === 'record' && RECORDING_SOURCES.includes(source as RecordingSource))
    return { kind, source: source as RecordingSource, name: String(name) }
  const simple = SIMPLE_KINDS.find((candidate) => candidate === kind)
  return simple ? { kind: simple } : { kind: 'close' }
}

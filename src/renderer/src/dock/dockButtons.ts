import { Check, Mic, Square, X, type LucideIcon } from 'lucide-react'
import type { DockAction } from '@shared/dock'

/** Icono y clave del título de cada acción de la píldora. */
export const DOCK_ACTIONS = {
  record: { icon: Mic, title: 'dock.record' },
  askEnd: { icon: Square, title: 'dock.askEnd' },
  stopAndSave: { icon: Check, title: 'dock.stopAndSave' },
  keepRecording: { icon: X, title: 'dock.keepRecording' },
  quit: { icon: Check, title: 'dock.quit' },
  stay: { icon: X, title: 'dock.stay' }
} as const satisfies Record<DockAction, { icon: LucideIcon; title: string }>

/** Mientras graba, el 🎤 de la derecha queda de indicador, sin acción. */
export const RECORDING_INDICATOR = { icon: Mic, title: 'dock.recording' } as const

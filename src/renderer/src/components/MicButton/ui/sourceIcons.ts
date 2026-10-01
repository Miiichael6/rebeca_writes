import { AudioLines, Mic, Volume2, type LucideIcon } from 'lucide-react'
import type { RecordingSource } from '@shared/recording'

/** Icono de cada fuente de grabación, en el menú del botón de grabar y en el del dock. */
export const SOURCE_ICONS: Record<RecordingSource, LucideIcon> = {
  system: Volume2,
  voice: Mic,
  both: AudioLines
}

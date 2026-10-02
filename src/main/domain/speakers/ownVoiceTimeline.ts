import { OWN_SPEAKER_ID } from '@shared/speakers'
import { peakToLevel } from '../capture/levelMeter'
import type { SpeakerTurn } from './alignSpeakers'

/**
 * Cuándo habla quien graba, en *Ambos* (tarea 35, D14): por cada bloque de la mezcla se mira el
 * micrófono y el sistema antes de sumarlos. Habla "Usted" si el micrófono suena y supera al
 * sistema por un margen; así el eco de los altavoces que recoge el micrófono (más bajo que el
 * propio sistema) no cuenta. Los bloques propios cercanos se unen en turnos.
 */

/** Nivel (0..1, escala de dB de `peakToLevel`) desde el que el micrófono cuenta como voz. */
export const OWN_VOICE_MIN_LEVEL = 0.4
/** Ventaja del micrófono sobre el sistema (≈ 5 dB en esa escala) para que la voz sea propia. */
export const OWN_VOICE_MARGIN = 0.1
/** Pausas propias más cortas que esto (entre palabras) no cortan el turno. */
export const OWN_TURN_GAP_SEC = 0.4

function peak(samples: Float32Array): number {
  let max = 0
  for (const value of samples) {
    const magnitude = Math.abs(value)
    if (magnitude > max) max = magnitude
  }
  return max
}

export class OwnVoiceTimeline {
  private readonly ownTurns: SpeakerTurn[] = []
  /** Segundos de grabación ya vistos. */
  private elapsed = 0

  constructor(
    private readonly sampleRate: number,
    private readonly channels: number
  ) {}

  /** Un bloque de la mezcla: `system` y `voice` intercalados, del mismo largo. */
  push(system: Float32Array, voice: Float32Array): void {
    const start = this.elapsed
    this.elapsed += system.length / this.channels / this.sampleRate
    const voiceLevel = peakToLevel(peak(voice))
    const own =
      voiceLevel >= OWN_VOICE_MIN_LEVEL &&
      voiceLevel >= peakToLevel(peak(system)) + OWN_VOICE_MARGIN
    if (own) this.extend(start, this.elapsed)
  }

  /** Los turnos propios hasta ahora, ordenados. */
  turns(): readonly SpeakerTurn[] {
    return this.ownTurns
  }

  private extend(start: number, end: number): void {
    const last = this.ownTurns.at(-1)
    if (last && start - last.end <= OWN_TURN_GAP_SEC) last.end = end
    else this.ownTurns.push({ start, end, speaker: OWN_SPEAKER_ID })
  }
}

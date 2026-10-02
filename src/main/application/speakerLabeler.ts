import type { Segment } from '@shared/types'
import { dominantSpeaker, type SpeakerTurn } from '../domain/speakers/alignSpeakers'
import { assignSpeaker, type SpeakerCluster } from '../domain/speakers/clusterSpeakers'
import type { SpeakerEmbedder } from './ports/speakerEmbedder'

/** Turnos ya conocidos de quien graba (la voz propia en *Ambos*, D14). */
export interface OwnVoice {
  turns(): readonly SpeakerTurn[]
}

/** Tramos más cortos no dan una huella fiable: se quedan con el hablante anterior. */
export const MIN_EMBED_SEC = 1

/**
 * Quién habla en cada segmento de una grabación (tarea 35). Primero la voz propia, si se sabe
 * por el canal; si no, la huella de voz del tramo agrupada con las personas ya vistas en esta
 * misma grabación. Un segmento sin huella posible se queda sin hablante (o con el anterior).
 */
export class SpeakerLabeler {
  private clusters: SpeakerCluster[] = []
  private last: string | undefined

  constructor(
    private readonly embedder: SpeakerEmbedder,
    private readonly ownVoice: OwnVoice | null
  ) {}

  /**
   * `segments` van en tiempos de `wav`, una ventana que empieza en `offsetSec` de la grabación.
   * Devuelve los mismos segmentos con `speaker`, en el mismo orden.
   */
  async label(wav: string, segments: readonly Segment[], offsetSec: number): Promise<Segment[]> {
    const labeled: Segment[] = []
    for (const segment of segments) {
      const speaker = await this.speakerOf(wav, segment, offsetSec)
      this.last = speaker ?? this.last
      labeled.push(speaker ? { ...segment, speaker } : segment)
    }
    return labeled
  }

  private async speakerOf(
    wav: string,
    segment: Segment,
    offsetSec: number
  ): Promise<string | undefined> {
    if (!segment.text.trim()) return undefined
    const own =
      this.ownVoice &&
      dominantSpeaker(this.ownVoice.turns(), offsetSec + segment.start, offsetSec + segment.end)
    if (own) return own
    if (segment.end - segment.start < MIN_EMBED_SEC) return this.last
    const embedding = await this.embedder.embed(wav, segment.start, segment.end)
    if (!embedding) return this.last
    const assignment = assignSpeaker(embedding, this.clusters)
    this.clusters = assignment.clusters
    return assignment.id
  }
}

import { personId } from '@shared/speakers'

/**
 * Agrupación en línea de huellas de voz (tarea 35): cada huella se compara con las personas ya
 * vistas y se queda con la más parecida si pasa el umbral; si no, nace una persona nueva. Cada
 * persona guarda la media de sus huellas (normalizadas), que se afina con cada segmento.
 */

/**
 * Similitud coseno mínima para que dos huellas sean la misma voz. Con el modelo CAM++ de
 * 3D-Speaker la misma voz da 0,95–0,99 y voces distintas 0,16–0,36 (prueba de la tarea 35).
 */
export const SAME_SPEAKER_THRESHOLD = 0.5

export interface SpeakerCluster {
  id: string
  /** Suma de las huellas normalizadas: su dirección es la media. */
  sum: readonly number[]
  count: number
}

export interface Assignment {
  id: string
  clusters: SpeakerCluster[]
}

function norm(vector: readonly number[]): number {
  let total = 0
  for (const value of vector) total += value * value
  return Math.sqrt(total)
}

function normalized(vector: readonly number[]): number[] {
  const length = norm(vector)
  return length > 0 ? vector.map((value) => value / length) : [...vector]
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const lengths = norm(a) * norm(b)
  if (lengths === 0) return 0
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot / lengths
}

/**
 * A quién pertenece `embedding` entre `known`: la persona más parecida desde `threshold`, o una
 * nueva (`p<n+1>`). Devuelve las personas actualizadas; `known` no se modifica.
 */
export function assignSpeaker(
  embedding: readonly number[],
  known: readonly SpeakerCluster[],
  threshold = SAME_SPEAKER_THRESHOLD
): Assignment {
  const unit = normalized(embedding)
  let best: SpeakerCluster | null = null
  let bestScore = threshold
  for (const cluster of known) {
    const score = cosineSimilarity(unit, cluster.sum)
    if (score >= bestScore) {
      best = cluster
      bestScore = score
    }
  }
  if (!best) {
    const created = { id: personId(known.length + 1), sum: unit, count: 1 }
    return { id: created.id, clusters: [...known, created] }
  }
  const match = best
  const updated = {
    id: match.id,
    sum: match.sum.map((value, i) => value + unit[i]),
    count: match.count + 1
  }
  return { id: match.id, clusters: known.map((c) => (c === match ? updated : c)) }
}

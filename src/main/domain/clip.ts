import { baseName } from '@shared/exporters'

/**
 * Recortar un tramo del audio o video (tarea 39). El recorte se guarda junto al original con el
 * tramo en el nombre; el original no se toca.
 */

/** Tramo más corto que se puede recortar, en segundos. */
export const MIN_CLIP_SEC = 0.5

/** ¿`[start, end)` es un tramo válido dentro de `durationSec`? (0 = duración desconocida). */
export function isValidClipRange(start: number, end: number, durationSec: number): boolean {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false
  if (start < 0 || end - start < MIN_CLIP_SEC) return false
  return durationSec <= 0 || start < durationSec
}

const pad = (n: number): string => String(n).padStart(2, '0')

/** `01m30s`, o `1h02m03s` desde la primera hora. Sin `:`, que Windows no admite en nombres. */
export function clipStamp(sec: number): string {
  const total = Math.max(0, Math.floor(sec))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}h${pad(m)}m${pad(s)}s` : `${pad(m)}m${pad(s)}s`
}

/** Extensión (sin punto) del archivo, en minúsculas; `''` si no tiene. */
export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : ''
}

/**
 * `<nombre> (01m30s-05m00s).<ext>`; con `copy` > 1, `<nombre> (01m30s-05m00s) (2).<ext>` para
 * no pisar un recorte anterior del mismo tramo.
 */
export function clipFileName(
  fileName: string,
  start: number,
  end: number,
  extension: string,
  copy = 1
): string {
  const suffix = copy > 1 ? ` (${copy})` : ''
  return `${baseName(fileName)} (${clipStamp(start)}-${clipStamp(end)})${suffix}.${extension}`
}

/**
 * Cómo se recorta:
 * - `copy`: sin recodificar, al instante y sin perder calidad. En video empieza en el fotograma
 *   clave anterior, así que puede traer un segundo o dos de más al principio (nunca de menos).
 * - `encode`: recodifica (video a H.264 + AAC en `.mp4`, audio a `.mp3`). Es el plan B cuando
 *   el contenedor no admite copiar las pistas tal cual.
 */
export type ClipMode = 'copy' | 'encode'

/** Extensión del recorte: la del original al copiar; `mp4` o `mp3` al recodificar. */
export function clipExtension(fileName: string, mode: ClipMode, hasVideo: boolean): string {
  if (mode === 'encode') return hasVideo ? 'mp4' : 'mp3'
  return extensionOf(fileName) || (hasVideo ? 'mp4' : 'mp3')
}

/** Argumentos de ffmpeg para recortar `[start, end)` de `input` a `out`. */
export function clipArgs(
  input: string,
  out: string,
  start: number,
  end: number,
  mode: ClipMode,
  hasVideo: boolean
): string[] {
  // `-ss` y `-t` antes de `-i`: busca en el archivo sin decodificar lo anterior.
  const range = ['-ss', start.toFixed(3), '-t', (end - start).toFixed(3), '-i', input]
  const codecs =
    mode === 'copy'
      ? ['-map', '0', '-c', 'copy', '-avoid_negative_ts', 'make_zero']
      : hasVideo
        ? [
            ['-map', '0:v:0', '-map', '0:a?'],
            ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p'],
            ['-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart']
          ].flat()
        : ['-map', '0:a', '-vn', '-c:a', 'libmp3lame', '-q:a', '2']
  return ['-y', '-hide_banner', '-loglevel', 'error', ...range, ...codecs, out]
}

/** Barras de la forma de onda del diálogo "Recortar". */
export const WAVEFORM_BARS = 240
/** Frecuencia a la que ffmpeg entrega el audio para la forma de onda: basta para ver la voz. */
export const WAVEFORM_RATE = 4000

/** Argumentos de ffmpeg para sacar la primera pista de audio como PCM s16le mono por stdout. */
export function waveformArgs(input: string): string[] {
  return [
    ['-hide_banner', '-loglevel', 'error', '-i', input, '-map', '0:a:0', '-vn'],
    ['-ac', '1', '-ar', String(WAVEFORM_RATE), '-f', 's16le', 'pipe:1']
  ].flat()
}

/**
 * Junta muestras PCM s16le en `bars` barras (el pico de cada tramo). `push` acepta trozos de
 * cualquier tamaño, aunque partan una muestra por la mitad.
 */
export class PeakAccumulator {
  private readonly peaks: number[]
  private readonly perBar: number
  private sample = 0
  private carry: number | null = null

  constructor(
    private readonly bars: number,
    durationSec: number,
    rate = WAVEFORM_RATE
  ) {
    this.peaks = new Array<number>(bars).fill(0)
    this.perBar = Math.max(1, Math.ceil((durationSec * rate) / bars))
  }

  push(chunk: Uint8Array): void {
    let i = 0
    if (this.carry !== null && chunk.length > 0) {
      this.add((((chunk[0] << 8) | this.carry) << 16) >> 16)
      this.carry = null
      i = 1
    }
    for (; i + 1 < chunk.length; i += 2) this.add((((chunk[i + 1] << 8) | chunk[i]) << 16) >> 16)
    if (i < chunk.length) this.carry = chunk[i]
  }

  /** Picos de 0 a 1, relativos al más alto y con curva de raíz para que la voz baja se vea. */
  result(): number[] {
    const max = Math.max(...this.peaks)
    return max > 0 ? this.peaks.map((p) => Math.sqrt(p / max)) : this.peaks.slice()
  }

  private add(value: number): void {
    const bar = Math.min(this.bars - 1, Math.floor(this.sample++ / this.perBar))
    const abs = Math.abs(value)
    if (abs > this.peaks[bar]) this.peaks[bar] = abs
  }
}

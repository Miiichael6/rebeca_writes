/**
 * Cambio de frecuencia de muestreo de PCM f32 intercalado (tarea 29, portado de Rebecca Listen):
 * lo capturado pasa a los 16 kHz de whisper y, en "Ambos", el micrófono a la frecuencia del
 * sonido del equipo.
 *
 * Sinc con ventana de Kaiser, precalculado para `PHASES` posiciones fraccionarias; los
 * coeficientes de una posición intermedia se interpolan entre las dos filas más cercanas. La
 * entrada se guarda entre llamadas (historia del filtro), así que los bordes de bloque no hacen
 * clic, y cómo se parta la entrada en bloques no cambia ni una muestra de la salida.
 */

/** Cruces por cero del sinc a cada lado: el filtro abarca el doble en la frecuencia de corte. */
const ZERO_CROSSINGS = 16
/** Forma de la ventana de Kaiser: más alto, más rechazo y transición más ancha. */
const KAISER_BETA = 7
/** Corte como fracción del Nyquist más bajo, dejando sitio a la banda de transición. */
const ROLLOFF = 0.9
/** Posiciones fraccionarias para las que se precalcula el filtro. */
const PHASES = 512

export interface ResamplerOptions {
  inRate: number
  outRate: number
  channels: number
}

/** Función de Bessel modificada de primera especie, orden 0 (para la ventana de Kaiser). */
function besselI0(x: number): number {
  let sum = 1
  let term = 1
  const quarterSquare = (x * x) / 4
  for (let k = 1; term > sum * 1e-12; k++) {
    term *= quarterSquare / (k * k)
    sum += term
  }
  return sum
}

/** El filtro a una distancia `x` (en cruces por cero) de su centro. */
function kernel(x: number): number {
  const ratio = x / ZERO_CROSSINGS
  if (ratio >= 1) return 0
  const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)
  return (sinc * besselI0(KAISER_BETA * Math.sqrt(1 - ratio * ratio))) / besselI0(KAISER_BETA)
}

/**
 * `PHASES + 1` filas de `taps` coeficientes; la fila `p` es para leer `p / PHASES` de muestra
 * después de la más nueva de la primera mitad. Cada fila suma 1: una señal constante sale igual.
 */
function buildPhaseTable(cutoff: number, halfTaps: number): Float32Array {
  const taps = halfTaps * 2
  const table = new Float32Array((PHASES + 1) * taps)
  for (let phase = 0; phase <= PHASES; phase++) {
    const fraction = phase / PHASES
    const row = table.subarray(phase * taps, (phase + 1) * taps)
    let sum = 0
    for (let tap = 0; tap < taps; tap++) {
      // El coeficiente 0 está `halfTaps - 1` muestras antes de la de la posición de lectura.
      const distance = fraction + halfTaps - 1 - tap
      row[tap] = kernel(Math.abs(distance) * cutoff)
      sum += row[tap]
    }
    for (let tap = 0; tap < taps; tap++) row[tap] /= sum
  }
  return table
}

export class Resampler {
  private readonly channels: number
  /** Muestras de entrada por muestra de salida. */
  private readonly step: number
  private readonly halfTaps: number
  private readonly table: Float32Array
  /** El filtro interpolado para la posición de lectura actual. */
  private readonly coefficients: Float32Array
  /** Entrada aún sin usar, con `halfTaps` muestras de historia delante. */
  private buffer = new Float32Array(0)
  private bufferedFrames = 0
  /** Posición de lectura: muestra `index` de `buffer` más `fraction` de muestra. */
  private index = 0
  private fraction = 0

  constructor({ inRate, outRate, channels }: ResamplerOptions) {
    this.channels = channels
    this.step = inRate / outRate
    // Al bajar la frecuencia el corte pasa al Nyquist de la salida, y el filtro se ensancha.
    const cutoff = Math.min(1, outRate / inRate) * ROLLOFF
    this.halfTaps = Math.ceil(ZERO_CROSSINGS / cutoff)
    this.table = buildPhaseTable(cutoff, this.halfTaps)
    this.coefficients = new Float32Array(this.halfTaps * 2)
    this.reset()
  }

  /** Convierte el bloque siguiente. Parte de la salida espera a la entrada que venga después. */
  process(input: Float32Array): Float32Array {
    if (this.passesThrough()) return input.slice()
    this.append(input)
    const out = this.convert()
    this.dropUsedInput()
    return out
  }

  /** La salida que aún esperaba entrada que ya no llegará; después empieza de cero. */
  flush(): Float32Array {
    if (this.passesThrough()) return new Float32Array(0)
    const out = this.process(new Float32Array(this.halfTaps * this.channels))
    this.reset()
    return out
  }

  /** Silencio antes de la primera muestra, para que la salida empiece a la par que la entrada. */
  private reset(): void {
    this.bufferedFrames = this.halfTaps
    this.buffer = new Float32Array(this.bufferedFrames * this.channels)
    this.index = this.halfTaps
    this.fraction = 0
  }

  /** Misma frecuencia: las muestras se copian tal cual. */
  private passesThrough(): boolean {
    return this.step === 1
  }

  private append(input: Float32Array): void {
    const needed = this.bufferedFrames * this.channels + input.length
    if (needed > this.buffer.length) {
      const grown = new Float32Array(Math.max(needed, this.buffer.length * 2))
      grown.set(this.buffer.subarray(0, this.bufferedFrames * this.channels))
      this.buffer = grown
    }
    this.buffer.set(input, this.bufferedFrames * this.channels)
    this.bufferedFrames += input.length / this.channels
  }

  private convert(): Float32Array {
    const { channels, halfTaps, table, buffer, step, coefficients } = this
    const taps = halfTaps * 2
    const lastIndex = this.bufferedFrames - halfTaps
    const available = Math.max(0, Math.ceil((lastIndex - this.index - this.fraction) / step) + 1)
    const out = new Float32Array(available * channels)
    const stepFrames = Math.floor(step)
    const stepFraction = step - stepFrames
    let index = this.index
    let fraction = this.fraction
    let frames = 0

    while (index < lastIndex) {
      const phase = fraction * PHASES
      const row = Math.floor(phase)
      const blend = phase - row
      const row0 = row * taps
      // Los coeficientes de esta posición, comunes a todos los canales.
      for (let tap = 0; tap < taps; tap++) {
        const low = table[row0 + tap]
        coefficients[tap] = low + blend * (table[row0 + taps + tap] - low)
      }
      const first = (index - halfTaps + 1) * channels
      for (let channel = 0; channel < channels; channel++) {
        let sum = 0
        for (let tap = 0, at = first + channel; tap < taps; tap++, at += channels) {
          sum += coefficients[tap] * buffer[at]
        }
        out[frames * channels + channel] = sum
      }
      frames++
      index += stepFrames
      fraction += stepFraction
      if (fraction >= 1) {
        fraction -= 1
        index++
      }
    }
    this.index = index
    this.fraction = fraction
    return out.subarray(0, frames * channels)
  }

  /** Conserva solo la historia que lee la siguiente muestra de salida. */
  private dropUsedInput(): void {
    const drop = Math.min(this.index - this.halfTaps, this.bufferedFrames)
    if (drop <= 0) return
    this.buffer.copyWithin(0, drop * this.channels, this.bufferedFrames * this.channels)
    this.bufferedFrames -= drop
    this.index -= drop
  }
}

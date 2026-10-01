/**
 * Cola FIFO de muestras f32 intercaladas, para el micrófono que espera a mezclarse con el
 * loopback (tarea 29, de Rebecca Listen). Capacidad fija: nunca crece, así que un micrófono que
 * se adelanta cuesta sus muestras más viejas, no memoria.
 */

export class SampleFifo {
  private readonly ring: Float32Array
  /** Muestra por canal donde empieza la próxima lectura. */
  private head = 0
  private size = 0

  constructor(
    private readonly channels: number,
    private readonly capacity: number
  ) {
    this.ring = new Float32Array(capacity * channels)
  }

  /** Muestras por canal esperando a leerse. */
  get frames(): number {
    return this.size
  }

  /** Añade `samples`; lo que no cabe echa primero lo más viejo. Devuelve cuántas se tiraron. */
  write(samples: Float32Array): number {
    let incoming = samples.length / this.channels
    let from = 0
    let dropped = 0
    if (incoming > this.capacity) {
      // Del bloque solo pueden quedarse las `capacity` más nuevas.
      dropped += incoming - this.capacity
      from = dropped * this.channels
      incoming = this.capacity
    }
    const overflow = this.size + incoming - this.capacity
    if (overflow > 0) {
      this.discard(overflow)
      dropped += overflow
    }
    this.copyIn(samples, from, incoming)
    return dropped
  }

  /** Tira las `frames` más viejas (o todas, si hay menos). */
  discard(frames: number): void {
    const count = Math.min(frames, this.size)
    this.head = (this.head + count) % this.capacity
    this.size -= count
  }

  /** Llena `out` con lo siguiente; si no alcanza, el resto son ceros. Devuelve lo que faltó. */
  read(out: Float32Array): number {
    const wanted = out.length / this.channels
    const available = Math.min(wanted, this.size)
    const firstPart = Math.min(available, this.capacity - this.head)
    const { channels } = this
    out.set(this.ring.subarray(this.head * channels, (this.head + firstPart) * channels), 0)
    out.set(this.ring.subarray(0, (available - firstPart) * channels), firstPart * channels)
    out.fill(0, available * channels)
    this.discard(available)
    return wanted - available
  }

  private copyIn(samples: Float32Array, from: number, frames: number): void {
    const { channels } = this
    const tail = (this.head + this.size) % this.capacity
    const firstPart = Math.min(frames, this.capacity - tail)
    this.ring.set(samples.subarray(from, from + firstPart * channels), tail * channels)
    this.ring.set(samples.subarray(from + firstPart * channels, from + frames * channels), 0)
    this.size += frames
  }
}

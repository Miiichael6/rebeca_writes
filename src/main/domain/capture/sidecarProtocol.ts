/**
 * El protocolo de `rl-capture.exe` (`native/PROTOCOL.md`, tarea 29): órdenes JSON por stdin,
 * eventos JSON por stderr (una línea cada uno) y bloques PCM binarios por stdout. Lógica pura:
 * reconstruye líneas y bloques se partan como se partan los trozos que llegan de las tuberías.
 */

/** `render` se captura en loopback (lo que suena en el equipo); `capture` es un micrófono. */
export type DeviceKind = 'render' | 'capture'

/** Un dispositivo tal como lo describe el sidecar (`native/src/device.rs`). */
export interface AudioDevice {
  id: string
  name: string
  groupName: string
  kind: DeviceKind
  isDefault: boolean
  channels: number
  sampleRate: number
}

export type SidecarCommand =
  | { cmd: 'list' }
  | { cmd: 'open'; streamId: number; deviceId: string; kind: DeviceKind }
  | { cmd: 'stop'; streamId: number }

export type StreamErrorReason = 'open_failed' | 'device_lost' | 'stream_failed'

export type SidecarEvent =
  | { type: 'devices'; devices: AudioDevice[] }
  | { type: 'warning'; message: string }
  | { type: 'error'; code: string; message: string }
  | { type: 'opened'; streamId: number; sampleRate: number; channels: number }
  | { type: 'stopped'; streamId: number }
  | { type: 'stream_error'; streamId: number; reason: StreamErrorReason; message: string }

/** Cabecera de cada bloque PCM: `[streamId u8][channels u16 LE][frameCount u32 LE]`. */
export const PCM_HEADER_BYTES = 7
const BYTES_PER_F32 = 4

export interface PcmBlock {
  streamId: number
  channels: number
  /** Muestras intercaladas, `frames × channels`. */
  samples: Float32Array
}

/** Una línea de stderr como evento, o `null` si no es un objeto JSON con `type` (un panic, p. ej.). */
export function parseSidecarEvent(line: string): SidecarEvent | null {
  let value: unknown
  try {
    value = JSON.parse(line)
  } catch {
    return null
  }
  const isEvent =
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  return isEvent ? (value as SidecarEvent) : null
}

/** Parte un flujo de texto en líneas no vacías, se corte donde se corte cada trozo. */
export class LineReader {
  private pending = ''

  constructor(private readonly onLine: (line: string) => void) {}

  push(chunk: string): void {
    this.pending += chunk
    let newline = this.pending.indexOf('\n')
    while (newline >= 0) {
      const line = this.pending.slice(0, newline).replace(/\r$/, '')
      this.pending = this.pending.slice(newline + 1)
      if (line.trim() !== '') this.onLine(line)
      newline = this.pending.indexOf('\n')
    }
  }
}

/** Rehace los bloques PCM de stdout, se corte donde se corte cada trozo. */
export class FrameDemuxer {
  private chunks: Buffer[] = []
  private buffered = 0

  constructor(private readonly onBlock: (block: PcmBlock) => void) {}

  push(chunk: Buffer): void {
    this.chunks.push(chunk)
    this.buffered += chunk.length
    if (this.buffered < PCM_HEADER_BYTES) return

    let data = Buffer.concat(this.chunks, this.buffered)
    let offset = 0
    while (data.length - offset >= PCM_HEADER_BYTES) {
      const channels = data.readUInt16LE(offset + 1)
      const frames = data.readUInt32LE(offset + 3)
      const length = PCM_HEADER_BYTES + frames * channels * BYTES_PER_F32
      if (data.length - offset < length) break

      const samples = new Float32Array(frames * channels)
      for (let index = 0; index < samples.length; index++) {
        samples[index] = data.readFloatLE(offset + PCM_HEADER_BYTES + index * BYTES_PER_F32)
      }
      this.onBlock({ streamId: data.readUInt8(offset), channels, samples })
      offset += length
    }

    data = data.subarray(offset)
    this.chunks = data.length > 0 ? [data] : []
    this.buffered = data.length
  }
}

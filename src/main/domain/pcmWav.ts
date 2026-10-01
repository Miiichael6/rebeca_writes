/** Cabecera WAV (RIFF, PCM) para mandar a whisper un trozo del `.pcm` en vivo (tarea 27). */

import { BYTES_PER_SAMPLE, SAMPLE_RATE } from './liveWindows'

const HEADER_BYTES = 44
const CHANNELS = 1

/** WAV completo: cabecera de 44 bytes + las muestras tal cual (s16le, 16 kHz, mono). */
export function pcmToWav(pcm: Uint8Array): Buffer {
  const header = Buffer.alloc(HEADER_BYTES)
  const blockAlign = CHANNELS * BYTES_PER_SAMPLE
  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(HEADER_BYTES - 8 + pcm.length, 4)
  header.write('WAVE', 8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(CHANNELS, 22)
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(SAMPLE_RATE * blockAlign, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(BYTES_PER_SAMPLE * 8, 34)
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

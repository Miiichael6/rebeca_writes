import { describe, expect, it } from 'vitest'
import {
  mp3Args,
  numberedFileName,
  recordingFileName
} from '../../src/main/domain/capture/recordingFile'

describe('recordingFile', () => {
  it('quita lo que Windows no admite en un nombre', () => {
    expect(recordingFileName('Grabación 2026-10-01 14:05 · Mi voz')).toBe(
      'Grabación 2026-10-01 14-05 · Mi voz'
    )
    expect(recordingFileName('a/b\\c?\u0007. ')).toBe('a-b-c--')
    expect(recordingFileName(' ... ')).toBe('recording')
  })

  it('numera a partir del segundo intento', () => {
    expect(numberedFileName('x', 1)).toBe('x.mp3')
    expect(numberedFileName('x', 3)).toBe('x (3).mp3')
  })

  it('lee el .pcm crudo y escribe MP3 con LAME', () => {
    const args = mp3Args('in.pcm', 'out.mp3')
    expect(args.join(' ')).toContain('-f s16le -ar 16000 -ac 1 -i in.pcm -c:a libmp3lame')
    expect(args.at(-1)).toBe('out.mp3')
  })
})

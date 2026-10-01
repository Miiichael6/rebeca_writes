import { describe, expect, it } from 'vitest'
import {
  FrameDemuxer,
  LineReader,
  parseSidecarEvent,
  type PcmBlock
} from '../../src/main/domain/capture/sidecarProtocol'

/** Un bloque tal como lo escribe `native/src/pcm.rs`. */
function block(streamId: number, channels: number, samples: number[]): Buffer {
  const frames = samples.length / channels
  const out = Buffer.alloc(7 + samples.length * 4)
  out.writeUInt8(streamId, 0)
  out.writeUInt16LE(channels, 1)
  out.writeUInt32LE(frames, 3)
  samples.forEach((sample, i) => out.writeFloatLE(sample, 7 + i * 4))
  return out
}

describe('FrameDemuxer', () => {
  it('rehace los bloques aunque lleguen partidos byte a byte y pegados entre sí', () => {
    const blocks: PcmBlock[] = []
    const demuxer = new FrameDemuxer((b) => blocks.push(b))
    const data = Buffer.concat([block(1, 2, [0.5, -0.5, 0.25, -0.25]), block(2, 1, [1])])
    for (const byte of data) demuxer.push(Buffer.from([byte]))

    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toMatchObject({ streamId: 1, channels: 2 })
    expect([...blocks[0].samples]).toEqual([0.5, -0.5, 0.25, -0.25])
    expect(blocks[1]).toMatchObject({ streamId: 2, channels: 1 })
    expect([...blocks[1].samples]).toEqual([1])
  })

  it('acepta varios bloques en un solo trozo', () => {
    const blocks: PcmBlock[] = []
    const demuxer = new FrameDemuxer((b) => blocks.push(b))
    demuxer.push(Buffer.concat([block(1, 1, [0.1]), block(1, 1, [0.2]), block(1, 1, [0.3])]))
    expect(blocks.map((b) => b.samples[0])).toEqual([0.1, 0.2, 0.3].map(Math.fround))
  })
})

describe('LineReader', () => {
  it('parte en líneas, quita el \\r y salta las vacías', () => {
    const lines: string[] = []
    const reader = new LineReader((line) => lines.push(line))
    reader.push('{"a":1}\r\n\n{"b"')
    reader.push(':2}\n')
    expect(lines).toEqual(['{"a":1}', '{"b":2}'])
  })
})

describe('parseSidecarEvent', () => {
  it('reconoce un evento y descarta lo que no es JSON con type', () => {
    expect(parseSidecarEvent('{"type":"stopped","streamId":1}')).toEqual({
      type: 'stopped',
      streamId: 1
    })
    expect(parseSidecarEvent("thread 'main' panicked")).toBeNull()
    expect(parseSidecarEvent('{"cmd":"list"}')).toBeNull()
  })
})

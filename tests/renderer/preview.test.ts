import { describe, expect, it } from 'vitest'
import type { OpenedMedia } from '@shared/types'
import { playbackFor, previewOf } from '@renderer/lib/preview'

const media: OpenedMedia = {
  id: 'orig',
  filePath: 'C:\\v\\clip.avi',
  fileName: 'clip.avi',
  info: {
    durationSec: 10,
    container: 'avi',
    videoCodec: 'mpeg4',
    audioTracks: [{ index: 0, codec: 'mp3', channels: 2 }],
    isChromiumPlayable: false
  },
  preview: { state: 'pending', audioId: null, percent: 0 }
}

describe('playbackFor', () => {
  it('sin vista previa suena el original', () => {
    expect(playbackFor(media, { state: 'none' })).toEqual({
      sourceId: 'orig',
      hasVideo: true,
      preparing: null,
      failed: false
    })
  })

  it('mientras se prepara: solo audio (si ya hay) y el porcentaje', () => {
    expect(playbackFor(media, { state: 'pending', audioId: null, percent: 0 })).toMatchObject({
      sourceId: null,
      hasVideo: false,
      preparing: 0
    })
    expect(playbackFor(media, { state: 'pending', audioId: 'tmp', percent: 42 })).toMatchObject({
      sourceId: 'tmp',
      hasVideo: false,
      preparing: 42
    })
  })

  it('lista: la vista previa con video', () => {
    expect(playbackFor(media, { state: 'ready', id: 'prev' })).toMatchObject({
      sourceId: 'prev',
      hasVideo: true,
      preparing: null
    })
  })

  it('fallida: se queda con el audio', () => {
    expect(playbackFor(media, { state: 'failed', audioId: 'tmp' })).toMatchObject({
      sourceId: 'tmp',
      hasVideo: false,
      failed: true
    })
  })
})

describe('previewOf', () => {
  it('lo que llega por eventos manda sobre la foto de OpenedMedia', () => {
    expect(previewOf({}, media)).toBe(media.preview)
    const ready = { state: 'ready', id: 'prev' } as const
    expect(previewOf({ orig: ready }, media)).toBe(ready)
  })
})

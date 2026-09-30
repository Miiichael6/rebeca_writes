import { describe, expect, it } from 'vitest'
import { isLiveArgv, parseLiveCommand } from '../../src/main/live/liveArgs'

const exe = 'C:\\RW\\rebeccawrites.exe'
const pcm = 'C:\\Temp\\rebecca-live\\1790790579084.pcm'

describe('parseLiveCommand', () => {
  it('lee el inicio con su nombre', () => {
    expect(parseLiveCommand([exe, '--live-start', pcm, '--live-name', 'Clase.mp3'])).toEqual({
      kind: 'start',
      pcm,
      name: 'Clase.mp3'
    })
  })

  it('sin nombre usa el del .pcm', () => {
    expect(parseLiveCommand([exe, '--live-start', pcm])).toEqual({
      kind: 'start',
      pcm,
      name: '1790790579084.pcm'
    })
  })

  it('lee el final con y sin archivo', () => {
    expect(parseLiveCommand([exe, '--live-end', pcm, '--live-media', 'C:\\a.mp3'])).toEqual({
      kind: 'end',
      pcm,
      media: 'C:\\a.mp3'
    })
    expect(parseLiveCommand([exe, '--live-end', pcm])).toEqual({ kind: 'end', pcm, media: null })
  })

  it('tolera opciones de Chromium delante', () => {
    const argv = [exe, '--allow-file-access-from-files', '--live-end', pcm]
    expect(parseLiveCommand(argv)?.kind).toBe('end')
  })

  it('lee la forma --flag=valor aunque Chromium reordene el argv', () => {
    const argv = [
      exe,
      '--allow-file-access-from-files',
      `--live-start=${pcm}`,
      '--live-name=reunión teams',
      'C:\\RW'
    ]
    expect(parseLiveCommand(argv)).toEqual({ kind: 'start', pcm, name: 'reunión teams' })
    expect(parseLiveCommand([exe, `--live-end=${pcm}`, '--live-media=C:\\a.mp3'])).toEqual({
      kind: 'end',
      pcm,
      media: 'C:\\a.mp3'
    })
  })

  it('sin opciones en vivo no hay orden', () => {
    expect(parseLiveCommand([exe, 'C:\\video.mp4'])).toBeNull()
    expect(parseLiveCommand([exe, '--live-start'])).toBeNull()
    expect(parseLiveCommand([exe, '--live-start', '--live-name', 'x'])).toBeNull()
  })
})

describe('isLiveArgv', () => {
  it('detecta cualquier --live-*', () => {
    expect(isLiveArgv([exe, '--live-end', pcm])).toBe(true)
    expect(isLiveArgv([exe, pcm])).toBe(false)
  })
})

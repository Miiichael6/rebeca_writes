import { execFileSync } from 'child_process'
import { existsSync } from 'fs'
import { mkdtemp, readdir, rm, stat, utimes, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { MediaInfo } from '@shared/types'
import { ffmpegPath, probe } from '../../src/main/infrastructure/ffmpeg/ffmpegTools'
import type { PreviewCacheEvents } from '../../src/main/application/ports/previewGenerator'
import {
  audioEncoders,
  audioPreviewArgs,
  pickEvictions,
  previewKey,
  previewPlan,
  videoPreviewArgs
} from '../../src/main/domain/previewPlan'
import { PreviewQueue } from '../../src/main/application/previewQueue'
import { ffmpegPreviewEncoder } from '../../src/main/infrastructure/ffmpeg/ffmpegPreviewEncoder'
import { fsPreviewStore } from '../../src/main/infrastructure/fs/fsPreviewStore'

/** La caché con los adaptadores reales (carpeta y ffmpeg), como en `index.ts`. */
function createCache(dir: string, maxBytes: () => number): PreviewQueue {
  return new PreviewQueue({ store: fsPreviewStore(dir), encoder: ffmpegPreviewEncoder, maxBytes })
}

function info(
  container: string,
  videoCodec: string | null,
  audioCodec: string,
  isChromiumPlayable = false
): MediaInfo {
  const audioTracks = [{ index: 0, codec: audioCodec, channels: 2 }]
  return { durationSec: 10, container, videoCodec, audioTracks, isChromiumPlayable }
}

describe('previewPlan', () => {
  it('no hace nada si Chromium lo reproduce', () => {
    expect(previewPlan(info('mov,mp4,m4a,3gp,3g2,mj2', 'h264', 'aac', true))).toBeNull()
  })

  it('HEVC en mp4/mkv con audio legible: suena el original mientras tanto', () => {
    expect(previewPlan(info('mov,mp4,m4a,3gp,3g2,mj2', 'hevc', 'aac'))).toEqual({
      audioOnly: false,
      audio: 'original'
    })
    expect(previewPlan(info('matroska,webm', 'hevc', 'opus'))?.audio).toBe('original')
  })

  it('HEVC en mkv con AC-3: hay que convertir el audio', () => {
    expect(previewPlan(info('matroska,webm', 'hevc', 'ac3'))?.audio).toBe('encode')
  })

  it('AVI/FLV con mp3 o aac: se copia el audio', () => {
    expect(previewPlan(info('avi', 'mpeg4', 'mp3'))).toEqual({ audioOnly: false, audio: 'copy' })
    expect(previewPlan(info('flv', 'flv1', 'aac'))?.audio).toBe('copy')
  })

  it('WMV con wmav2: se convierte a AAC', () => {
    expect(previewPlan(info('asf', 'wmv2', 'wmav2'))?.audio).toBe('encode')
  })

  it('audio que Chromium no lee (wma, amr): solo audio', () => {
    expect(previewPlan(info('asf', null, 'wmav2'))).toEqual({ audioOnly: true, audio: 'encode' })
    expect(previewPlan(info('aac', null, 'aac'))).toEqual({ audioOnly: true, audio: 'copy' })
  })
})

describe('previewKey', () => {
  it('cambia con la ruta, el tamaño o la fecha', () => {
    const base = previewKey('C:\\v\\a.avi', 100, 1000)
    expect(base).toMatch(/^[0-9a-f]{40}$/)
    expect(previewKey('C:\\v\\b.avi', 100, 1000)).not.toBe(base)
    expect(previewKey('C:\\v\\a.avi', 101, 1000)).not.toBe(base)
    expect(previewKey('C:\\v\\a.avi', 100, 2000)).not.toBe(base)
  })

  it.runIf(process.platform === 'win32')('no distingue mayúsculas en Windows', () => {
    expect(previewKey('C:\\V\\A.AVI', 100, 1000)).toBe(previewKey('c:\\v\\a.avi', 100, 1000))
  })
})

describe('argumentos de ffmpeg', () => {
  it('video: H.264 ultrafast crf 28, AAC, faststart, yuv420p', () => {
    const args = videoPreviewArgs('in.avi', 'out.part').join(' ')
    expect(args).toContain('-c:v libx264 -preset ultrafast -crf 28')
    expect(args).toContain('-c:a aac')
    expect(args).toContain('-movflags +faststart')
    expect(args).toContain('-pix_fmt yuv420p')
    expect(args).toContain('-map 0:v:0 -map 0:a:0?')
    expect(args.endsWith('-f mp4 -progress pipe:1 out.part')).toBe(true)
  })

  it('audio: copia o AAC, sin video', () => {
    expect(audioPreviewArgs('a', 'b', 'copy').join(' ')).toContain('-vn -sn -dn -c:a copy')
    expect(audioPreviewArgs('a', 'b', 'aac_mf').join(' ')).toContain('-c:a aac_mf')
    expect(audioPreviewArgs('a', 'b', 'aac').join(' ')).toContain('-c:a aac -aac_coder fast')
  })

  it('el audio provisional prueba primero lo más rápido y termina en aac', () => {
    const win = process.platform === 'win32'
    expect(audioEncoders(true)).toEqual(win ? ['copy', 'aac_mf', 'aac'] : ['copy', 'aac'])
    expect(audioEncoders(false)).toEqual(win ? ['aac_mf', 'aac'] : ['aac'])
  })
})

describe('pickEvictions', () => {
  const files = [
    { name: 'new.mp4', size: 400, mtimeMs: 3 },
    { name: 'old.mp4', size: 400, mtimeMs: 1 },
    { name: 'mid.mp4', size: 400, mtimeMs: 2 }
  ]

  it('dentro del límite no borra nada', () => {
    expect(pickEvictions(files, 1200)).toEqual([])
  })

  it('borra del menos al más usado hasta entrar en el límite', () => {
    expect(pickEvictions(files, 800)).toEqual(['old.mp4'])
    expect(pickEvictions(files, 500)).toEqual(['old.mp4', 'mid.mp4'])
  })

  it('nunca borra lo que se pide conservar, aunque solo pase del límite', () => {
    expect(pickEvictions(files, 500, ['old.mp4'])).toEqual(['mid.mp4', 'new.mp4'])
    expect(pickEvictions(files, 100, ['new.mp4'])).toEqual(['old.mp4', 'mid.mp4'])
  })
})

/** Espera al primer evento `ready` o `failed` de `input` y junta lo que pasó antes. */
function waitFor(
  cache: PreviewQueue,
  input: string
): Promise<{ result: string | Error; audio: string[]; progress: number[] }> {
  const audio: string[] = []
  const progress: number[] = []
  return new Promise((resolve) => {
    const onAudio = (i: string, p: string): void => void (i === input && audio.push(p))
    const onProgress = (i: string, p: number): void => void (i === input && progress.push(p))
    const done = (i: string, result: string | Error): void => {
      if (i !== input) return
      cache.off('audio', onAudio).off('progress', onProgress)
      cache.off('ready', done).off('failed', done)
      resolve({ result, audio, progress })
    }
    cache.on('audio', onAudio).on('progress', onProgress)
    cache.on('ready', done as (...a: PreviewCacheEvents['ready']) => void)
    cache.on('failed', done as (...a: PreviewCacheEvents['failed']) => void)
  })
}

describe('PreviewQueue con ffmpeg real', () => {
  let dir: string
  let cacheDir: string
  const ff = (...args: string[]): void => {
    execFileSync(ffmpegPath(), ['-hide_banner', '-loglevel', 'error', '-y', ...args])
  }
  const video = ['-f', 'lavfi', '-i', 'testsrc=d=4:s=322x182:r=25']
  const sine = ['-f', 'lavfi', '-i', 'sine=d=4']

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'preview-test-'))
    cacheDir = join(dir, 'cache')
    ff(...video, ...sine, '-c:v', 'mpeg4', '-c:a', 'libmp3lame', join(dir, 'clip.avi'))
    ff(...video, ...sine, '-c:v', 'wmv2', '-c:a', 'wmav2', join(dir, 'clip.wmv'))
    ff(...video, ...sine, '-c:v', 'flv', '-c:a', 'libmp3lame', '-ar', '44100', join(dir, 'clip.flv'))
    ff(...video, ...sine, '-c:v', 'libx265', '-pix_fmt', 'yuv420p10le', '-c:a', 'ac3', join(dir, 'hevc.mkv'))
    ff(...sine, '-c:a', 'wmav2', join(dir, 'song.wma'))
    ff('-f', 'lavfi', '-i', 'testsrc=d=120:s=1280x720:r=30', '-f', 'lavfi', '-i', 'sine=d=120', '-c:v', 'mpeg4', '-q:v', '31', '-c:a', 'libmp3lame', join(dir, 'long.avi'))
  }, 120_000) // prettier-ignore

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  const cases = [
    ['clip.avi', 'mpeg4', true],
    ['clip.wmv', 'wmv2', true],
    ['clip.flv', 'flv1', true],
    ['hevc.mkv', 'hevc', true]
  ] as const

  it.each(cases)(
    '%s (%s): audio provisional y luego MP4 H.264 que Chromium reproduce',
    async (name, codec) => {
      const cache = createCache(cacheDir, () => 1e9)
      const input = join(dir, name)
      const probed = await probe(input)
      expect(probed.videoCodec).toBe(codec)
      expect(probed.isChromiumPlayable).toBe(false)
      const plan = previewPlan(probed)!

      const events = waitFor(cache, input)
      await cache.request(input, plan, probed.durationSec)
      const { result, audio, progress } = await events

      expect(result).toMatch(/\.mp4$/)
      // El audio provisional llega antes que la vista previa y es un m4a AAC/mp3 legible.
      expect(audio).toHaveLength(1)
      const audioInfo = await probe(audio[0])
      expect(audioInfo.videoCodec).toBeNull()
      expect(audioInfo.isChromiumPlayable).toBe(true)
      expect(progress.at(-1)).toBe(100)

      const preview = await probe(result as string)
      expect(preview.videoCodec).toBe('h264')
      expect(preview.audioTracks[0].codec).toBe('aac')
      expect(preview.isChromiumPlayable).toBe(true)
      expect(preview.durationSec).toBeGreaterThan(3.5)

      // La segunda vez está en caché.
      expect(await cache.lookup(input, plan)).toEqual({ path: result })
    },
    60_000
  )

  it('audio que Chromium no lee: un m4a AAC es la vista previa', async () => {
    const cache = createCache(cacheDir, () => 1e9)
    const input = join(dir, 'song.wma')
    const probed = await probe(input)
    const plan = previewPlan(probed)!
    expect(plan.audioOnly).toBe(true)
    const events = waitFor(cache, input)
    await cache.request(input, plan, probed.durationSec)
    const { result, audio } = await events
    expect(audio).toEqual([])
    expect(result).toMatch(/\.m4a$/)
    const preview = await probe(result as string)
    expect(preview.audioTracks[0].codec).toBe('aac')
    expect(preview.isChromiumPlayable).toBe(true)
  }, 60_000)

  it('una sola generación a la vez, y la última pedida va primero', async () => {
    const cache = createCache(join(dir, 'order'), () => 1e9)
    // El largo ocupa la generación mientras se piden los otros tres.
    const inputs = ['long.avi', 'clip.avi', 'clip.wmv', 'clip.flv'].map((n) => join(dir, n))
    const active = new Set<string>()
    let overlap = false
    const order: string[] = []
    cache.on('progress', (input) => {
      active.add(input)
      if (active.size > 1) overlap = true
    })
    const all = Promise.all(
      inputs.map((input) =>
        waitFor(cache, input).then(({ result }) => {
          expect(result).toMatch(/\.mp4$/)
          active.delete(input)
          order.push(input)
        })
      )
    )
    for (const input of inputs) {
      const probed = await probe(input)
      await cache.request(input, previewPlan(probed)!, probed.durationSec)
    }
    await all
    expect(overlap).toBe(false)
    expect(order).toEqual([inputs[0], inputs[3], inputs[2], inputs[1]])
  }, 180_000)

  it('respeta el límite borrando lo menos usado', async () => {
    const own = join(dir, 'lru')
    let limit = 1e9
    const cache = createCache(own, () => limit)
    const make = async (name: string): Promise<string> => {
      const input = join(dir, name)
      const probed = await probe(input)
      const events = waitFor(cache, input)
      await cache.request(input, previewPlan(probed)!, probed.durationSec)
      return (await events).result as string
    }
    const avi = await make('clip.avi')
    const wmv = await make('clip.wmv')
    const flv = await make('clip.flv')
    // Uso: avi hace más tiempo, luego wmv, flv lo último.
    await utimes(avi, new Date(1000), new Date(1000))
    await utimes(wmv, new Date(2000), new Date(2000))
    const size = async (p: string): Promise<number> => (await stat(p)).size

    // Queda el audio provisional del flv (el último); también cuenta para el límite y es el
    // más reciente, así que se le deja sitio.
    const temps = (await readdir(own)).filter((n) => n.includes('tmp-audio'))
    expect(temps).toHaveLength(1)
    const tempSize = await size(join(own, temps[0]))
    limit = (await size(wmv)) + (await size(flv)) + tempSize + 10
    await cache.enforceLimit()
    expect([existsSync(avi), existsSync(wmv), existsSync(flv)]).toEqual([false, true, true])
    expect(await cache.size()).toBeLessThanOrEqual(limit)

    // Con sitio solo para una vista previa se va el wmv y luego el audio provisional.
    limit = (await size(flv)) + 10
    await cache.enforceLimit()
    expect([existsSync(wmv), existsSync(flv)]).toEqual([false, true])
    expect(await readdir(own)).toEqual([flv.slice(own.length + 1)])
    expect(await cache.size()).toBeLessThanOrEqual(limit)
  }, 120_000)

  it('al arrancar borra lo que quedó a medias', async () => {
    const own = join(dir, 'leftovers')
    const first = createCache(own, () => 1e9)
    await first.size()
    await writeFile(join(own, 'abc.mp4.part'), 'x')
    await writeFile(join(own, 'abc.tmp-audio.m4a'), 'x')
    await writeFile(join(own, 'abc.mp4'), 'x')
    const second = createCache(own, () => 1e9)
    await second.size()
    expect(await readdir(own)).toEqual(['abc.mp4'])
  })

  it('clear() cancela la generación en curso y vacía la carpeta', async () => {
    const own = join(dir, 'clear')
    const long = join(dir, 'long.avi')
    const cache = createCache(own, () => 1e9)
    const probed = await probe(long)
    let finished = false
    cache.on('ready', () => (finished = true)).on('failed', () => (finished = true))
    const started = new Promise<void>((resolve) =>
      cache.on('progress', (_i, p) => p >= 1 && resolve())
    )
    await cache.request(long, previewPlan(probed)!, probed.durationSec)
    await started
    await cache.clear()
    expect(await readdir(own)).toEqual([])
    await new Promise((r) => setTimeout(r, 300))
    expect(finished).toBe(false)
    // Nunca toca el original.
    expect(existsSync(long)).toBe(true)
  }, 180_000)
})

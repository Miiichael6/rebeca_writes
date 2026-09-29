import { execFileSync } from 'child_process'
import { existsSync } from 'fs'
import { mkdtemp, open, readdir, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { isChromiumPlayable, mediaFileFilters } from '@shared/formats'
import {
  conversionErrorCode,
  createProgressParser,
  ffmpegPath,
  MediaError,
  parseProbeOutput,
  probe,
  toWav,
  unpackedPath,
  wavArgs
} from '../../src/main/services/ffmpeg'

// Salida real de ffprobe 4.0.2 (ffprobe-static), recortada a los campos que se leen.
const MKV_TWO_TRACKS = JSON.stringify({
  streams: [
    { index: 0, codec_name: 'h264', codec_type: 'video', disposition: { attached_pic: 0 } },
    {
      index: 1,
      codec_name: 'aac',
      codec_type: 'audio',
      channels: 1,
      disposition: { attached_pic: 0 },
      tags: { language: 'spa', DURATION: '00:00:03.023000000' }
    },
    {
      index: 2,
      codec_name: 'aac',
      codec_type: 'audio',
      channels: 1,
      disposition: { attached_pic: 0 },
      tags: { language: 'eng', title: 'Commentary' }
    }
  ],
  format: { format_name: 'matroska,webm', duration: '3.023000' }
})

const MP4_NO_AUDIO = JSON.stringify({
  streams: [{ index: 0, codec_name: 'h264', codec_type: 'video', duration: '3.000000' }],
  format: { format_name: 'mov,mp4,m4a,3gp,3g2,mj2', duration: '3.000000' }
})

const MP3_WITH_COVER = JSON.stringify({
  streams: [
    { index: 0, codec_name: 'mp3', codec_type: 'audio', channels: 2, duration: '215.4' },
    {
      index: 1,
      codec_name: 'mjpeg',
      codec_type: 'video',
      disposition: { attached_pic: 1 },
      tags: { language: 'und' }
    }
  ],
  format: { format_name: 'mp3', duration: '215.400000' }
})

const WMV = JSON.stringify({
  streams: [
    { index: 0, codec_name: 'wmav2', codec_type: 'audio', channels: 2, tags: { language: 'und' } },
    { index: 1, codec_name: 'wmv2', codec_type: 'video' }
  ],
  format: { format_name: 'asf', duration: '60.5' }
})

describe('parseProbeOutput', () => {
  it('lee duración, contenedor, video y cada pista de audio', () => {
    expect(parseProbeOutput(MKV_TWO_TRACKS)).toEqual({
      durationSec: 3.023,
      container: 'matroska,webm',
      videoCodec: 'h264',
      audioTracks: [
        { index: 0, language: 'spa', codec: 'aac', channels: 1 },
        { index: 1, language: 'eng', title: 'Commentary', codec: 'aac', channels: 1 }
      ],
      isChromiumPlayable: true
    })
  })

  it('no cuenta la carátula como video y omite el idioma "und"', () => {
    const info = parseProbeOutput(MP3_WITH_COVER)
    expect(info.videoCodec).toBeNull()
    expect(info.audioTracks).toEqual([{ index: 0, codec: 'mp3', channels: 2 }])
    expect(info.isChromiumPlayable).toBe(true)
  })

  it('devuelve lista vacía si no hay audio (probe lo convierte en noAudioStream)', () => {
    expect(parseProbeOutput(MP4_NO_AUDIO).audioTracks).toEqual([])
  })

  it('marca como no reproducible un contenedor fuera de la lista', () => {
    expect(parseProbeOutput(WMV).isChromiumPlayable).toBe(false)
  })

  it('usa la duración del stream más largo si el formato no la trae', () => {
    const json = JSON.stringify({
      streams: [
        { codec_type: 'video', codec_name: 'h264', duration: '10.5' },
        { codec_type: 'audio', codec_name: 'aac', duration: '12.25' }
      ],
      format: { format_name: 'mpegts' }
    })
    expect(parseProbeOutput(json).durationSec).toBe(12.25)
  })

  it('falla con unreadableMedia si la salida no es válida', () => {
    expect(() => parseProbeOutput('no es json')).toThrow(MediaError)
    expect(() => parseProbeOutput('{}')).toThrow(/unreadableMedia/)
  })
})

describe('isChromiumPlayable', () => {
  it.each([
    ['mov,mp4,m4a,3gp,3g2,mj2', 'h264', 'aac'],
    ['matroska,webm', 'vp9', 'opus'],
    ['matroska,webm', 'av1', 'vorbis'],
    ['matroska,webm', 'h264', 'mp3'],
    ['mp3', null, 'mp3'],
    ['wav', null, 'pcm_s16le'],
    ['mov,mp4,m4a,3gp,3g2,mj2', 'h264', null]
  ])('%s con %s/%s se reproduce', (container, video, audio) => {
    expect(isChromiumPlayable(container, video, audio)).toBe(true)
  })

  it.each([
    ['avi', 'h264', 'mp3'],
    ['asf', 'wmv2', 'wmav2'],
    ['mov,mp4,m4a,3gp,3g2,mj2', 'hevc', 'aac'],
    ['matroska,webm', 'mpeg4', 'aac'],
    ['matroska,webm', 'h264', 'ac3'],
    ['mpegts', 'h264', 'aac'],
    ['mov,mp4,m4a,3gp,3g2,mj2', 'h264', 'pcm_s24le']
  ])('%s con %s/%s necesita vista previa', (container, video, audio) => {
    expect(isChromiumPlayable(container, video, audio)).toBe(false)
  })
})

describe('createProgressParser', () => {
  it('convierte out_time_ms (µs) en porcentaje, aunque lleguen trozos partidos', () => {
    const seen: number[] = []
    const push = createProgressParser(10, (p) => seen.push(p))
    push('frame=0\nout_time_us=2500000\nout_time_ms=25')
    push('00000\nout_time=00:00:02.500000\nprogress=continue\n')
    push('out_time_ms=N/A\nout_time_ms=7000000\nprogress=continue\n')
    push('out_time_ms=10200000\nprogress=end\n')
    expect(seen).toEqual([25, 70, 100])
  })

  it('sin duración solo avisa al terminar', () => {
    const seen: number[] = []
    const push = createProgressParser(0, (p) => seen.push(p))
    push('out_time_ms=5000000\nprogress=continue\nprogress=end\n')
    expect(seen).toEqual([100])
  })
})

describe('conversionErrorCode', () => {
  it('reconoce el disco lleno en el stderr de ffmpeg', () => {
    const stderr =
      'Error writing trailer of C:\\tmp\\audio.wav: No space left on device\n' +
      'Error closing file C:\\tmp\\audio.wav: No space left on device'
    expect(conversionErrorCode(stderr)).toBe('noDiskSpace')
  })

  it('cualquier otro fallo es conversionFailed', () => {
    expect(conversionErrorCode('Invalid data found when processing input')).toBe('conversionFailed')
    expect(conversionErrorCode('')).toBe('conversionFailed')
  })
})

describe('rutas y argumentos', () => {
  it('pasa de app.asar a app.asar.unpacked', () => {
    const packed = join('C:', 'App', 'resources', 'app.asar', 'node_modules', 'x', 'ffmpeg.exe')
    expect(unpackedPath(packed)).toBe(
      join('C:', 'App', 'resources', 'app.asar.unpacked', 'node_modules', 'x', 'ffmpeg.exe')
    )
    expect(unpackedPath(join('C:', 'dev', 'ffmpeg.exe'))).toBe(join('C:', 'dev', 'ffmpeg.exe'))
  })

  it('elige la pista y añade loudnorm solo si se pide', () => {
    const plain = wavArgs('in.mkv', 'out.wav', 1)
    expect(plain.join(' ')).toContain('-map 0:a:1 -vn -sn -dn -ar 16000 -ac 1 -c:a pcm_s16le')
    expect(plain).not.toContain('loudnorm')
    expect(wavArgs('in.mkv', 'out.wav', 0, true).join(' ')).toContain('-af loudnorm -ar 16000')
  })

  it('los filtros del diálogo incluyen todos los medios y "Todos los archivos"', () => {
    const filters = mediaFileFilters((key) => key)
    expect(filters.map((f) => f.name)).toEqual(['allMedia', 'video', 'audio', 'allFiles'])
    expect(filters[0].extensions).toContain('mkv')
    expect(filters[0].extensions).toContain('mp3')
    expect(filters[3].extensions).toEqual(['*'])
  })
})

// ── Con los binarios reales ──────────────────────────────────────────────────

/** Formato de un WAV: canales, frecuencia y bits por muestra de su cabecera `fmt `. */
async function wavFormat(path: string): Promise<{ format: number; channels: number; rate: number; bits: number }> {
  const handle = await open(path, 'r')
  const header = Buffer.alloc(44)
  await handle.read(header, 0, 44, 0)
  await handle.close()
  expect(header.toString('ascii', 0, 4)).toBe('RIFF')
  expect(header.toString('ascii', 8, 12)).toBe('WAVE')
  return {
    format: header.readUInt16LE(20),
    channels: header.readUInt16LE(22),
    rate: header.readUInt32LE(24),
    bits: header.readUInt16LE(34)
  }
} // prettier-ignore

describe('probe y toWav con ffmpeg real', () => {
  let dir = ''
  const ff = (...args: string[]): void => {
    execFileSync(ffmpegPath(), ['-hide_banner', '-loglevel', 'error', '-y', ...args])
  }
  const video = ['-f', 'lavfi', '-i', 'testsrc=d=3:s=160x120']

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ffmpeg-test-'))
    ff(...video, '-f', 'lavfi', '-i', 'sine=d=3', '-c:v', 'libx264', '-c:a', 'aac', join(dir, 'clip.mp4'))
    ff(
      ...video, '-f', 'lavfi', '-i', 'sine=f=440:d=3', '-f', 'lavfi', '-i', 'sine=f=880:d=3:sample_rate=48000',
      '-map', '0', '-map', '1', '-map', '2', '-ac:a:1', '2', '-c:v', 'libx264', '-c:a', 'aac',
      join(dir, 'two.mkv')
    )
    ff('-f', 'lavfi', '-i', 'sine=d=3', '-c:a', 'libmp3lame', join(dir, 'song.mp3'))
    ff(...video, '-c:v', 'libx264', join(dir, 'silent.mp4'))
    ff('-f', 'lavfi', '-i', 'sine=d=600', '-c:a', 'libmp3lame', join(dir, 'long.mp3'))
    await writeFile(join(dir, 'garbage.bin'), Buffer.from([0xde, 0xad, 0xbe, 0xef, 0, 1, 2, 3]))
  }, 60_000) // prettier-ignore

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it.each(['clip.mp4', 'two.mkv', 'song.mp3'])('%s → WAV 16 kHz mono s16le', async (name) => {
    const info = await probe(join(dir, name))
    expect(info.durationSec).toBeGreaterThan(2.9)
    const progress: number[] = []
    const out = await toWav(join(dir, name), {
      outDir: join(dir, `job-${name}`),
      durationSec: info.durationSec,
      onProgress: (p) => progress.push(p)
    })
    expect(await wavFormat(out)).toEqual({ format: 1, channels: 1, rate: 16000, bits: 16 })
    expect(progress.at(-1)).toBe(100)
  })

  it('con dos pistas usa la elegida', async () => {
    const info = await probe(join(dir, 'two.mkv'))
    expect(info.audioTracks.map((t) => t.channels)).toEqual([1, 2])
    const out = await toWav(join(dir, 'two.mkv'), { outDir: join(dir, 'job-track'), track: 1 })
    expect(await wavFormat(out)).toEqual({ format: 1, channels: 1, rate: 16000, bits: 16 })
    // La pista que no existe falla con conversionFailed y no deja la carpeta.
    await expect(
      toWav(join(dir, 'two.mkv'), { outDir: join(dir, 'job-bad'), track: 5 })
    ).rejects.toMatchObject({ code: 'conversionFailed' })
    expect(existsSync(join(dir, 'job-bad'))).toBe(false)
  })

  it('con loudnorm el WAV sigue siendo 16 kHz mono s16le', async () => {
    const out = await toWav(join(dir, 'clip.mp4'), {
      outDir: join(dir, 'job-norm'),
      normalize: true
    })
    expect(await wavFormat(out)).toEqual({ format: 1, channels: 1, rate: 16000, bits: 16 })
  })

  it('sin pista de audio falla con noAudioStream', async () => {
    await expect(probe(join(dir, 'silent.mp4'))).rejects.toMatchObject({ code: 'noAudioStream' })
  })

  it('un archivo que no es multimedia falla con unreadableMedia', async () => {
    await expect(probe(join(dir, 'garbage.bin'))).rejects.toMatchObject({
      code: 'unreadableMedia'
    })
  })

  it('cancelar mata ffmpeg y borra la carpeta del trabajo', async () => {
    const outDir = join(dir, 'job-cancel')
    const controller = new AbortController()
    const pending = toWav(join(dir, 'long.mp3'), {
      outDir,
      normalize: true,
      durationSec: 600,
      onProgress: (p) => {
        if (p >= 1) controller.abort()
      },
      signal: controller.signal
    })
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(existsSync(outDir)).toBe(false)
    expect(await readdir(dir)).not.toContain('job-cancel')
  }, 30_000)
})

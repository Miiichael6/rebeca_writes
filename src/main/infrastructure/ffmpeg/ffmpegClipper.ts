import { spawn } from 'child_process'
import { rm } from 'fs/promises'
import type { Clipper } from '../../application/ports/clipper'
import { PeakAccumulator, waveformArgs } from '../../domain/clip'
import { lastLines } from '../../domain/text'
import { ffmpegPath } from './ffmpegTools'

/** Adaptador de `Clipper` con ffmpeg (tarea 39). Si un recorte falla, no lo deja a medias. */
export const ffmpegClipper: Clipper = {
  async run(args, out) {
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(ffmpegPath(), args, { windowsHide: true })
        let stderr = ''
        child.stderr.on('data', (d: Buffer) => (stderr += d.toString('utf8')))
        child.on('error', reject)
        child.on('close', (code) =>
          code === 0 ? resolve() : reject(new Error(`ffmpeg (${code}): ${lastLines(stderr)}`))
        )
      })
    } catch (err) {
      await rm(out, { force: true })
      throw err
    }
  },

  waveform(input, durationSec, bars) {
    return new Promise((resolve, reject) => {
      const peaks = new PeakAccumulator(bars, durationSec)
      const child = spawn(ffmpegPath(), waveformArgs(input), { windowsHide: true })
      let stderr = ''
      child.stdout.on('data', (d: Buffer) => peaks.push(d))
      child.stderr.on('data', (d: Buffer) => (stderr += d.toString('utf8')))
      child.on('error', reject)
      child.on('close', (code) =>
        code === 0
          ? resolve(peaks.result())
          : reject(new Error(`ffmpeg (${code}): ${lastLines(stderr)}`))
      )
    })
  }
}

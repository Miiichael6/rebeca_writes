import { spawn } from 'child_process'
import { rm } from 'fs/promises'
import type { RecordingEncoder } from '../../application/ports/recordingFiles'
import { mp3Args } from '../../domain/capture/recordingFile'
import { lastLines } from '../../domain/text'
import { ffmpegPath } from './ffmpegTools'

/** Adaptador de `RecordingEncoder` con ffmpeg (tarea 29). Si falla, no deja un MP3 a medias. */
export const ffmpegRecordingEncoder: RecordingEncoder = {
  async pcmToMp3(pcm, out) {
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn(ffmpegPath(), mp3Args(pcm, out), { windowsHide: true })
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
  }
}

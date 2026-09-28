import { join } from 'path'
import { app } from 'electron'
import { APP_NAME } from '@shared/app'

/** Carpeta temporal de un trabajo: `%TEMP%/<app>/<jobId>/` (WAV de ffmpeg, spec §2.3). */
export function jobTempDir(jobId: string): string {
  return join(app.getPath('temp'), APP_NAME.toLowerCase(), jobId)
}

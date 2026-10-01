import { net } from 'electron'
import type { FileDownloader } from '../../application/ports/fileDownloader'
import { downloadWithResume } from '../downloads/modelDownload'

/** Adaptador de `FileDownloader`: `net.fetch` usa la red de Chromium y respeta el proxy del sistema. */
export const netDownloader: FileDownloader = {
  download: (request) =>
    downloadWithResume({ ...request, fetch: (url, init) => net.fetch(url, init) })
}

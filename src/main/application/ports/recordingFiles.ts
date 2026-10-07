import type { RecordingFormat } from '@shared/recording'

/** El `.pcm` abierto mientras se graba. */
export interface PcmWriter {
  append(chunk: Buffer): void
  /** Espera a que todo lo escrito esté en disco. */
  close(): Promise<void>
}

/** Puerto de salida: el disco de las grabaciones del micrófono (tarea 29). */
export interface RecordingFiles {
  /** Crea un `.pcm` vacío en la carpeta temporal y lo deja abierto para escribir. */
  createPcm(): Promise<{ path: string; writer: PcmWriter }>
  /** Ruta libre para `<name>.<format>` en `dir` (creándola si no existe), sin pisar nada. */
  freeRecordingPath(dir: string, name: string, format: RecordingFormat): Promise<string>
  remove(path: string): Promise<void>
}

/** Puerto de salida: pasar el `.pcm` en vivo a la grabación final. */
export interface RecordingEncoder {
  encode(pcm: string, out: string, format: RecordingFormat): Promise<void>
}

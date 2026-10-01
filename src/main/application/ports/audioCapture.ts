import type { DeviceKind } from '../../domain/capture/sidecarProtocol'

/** Un dispositivo abierto que va entregando audio (tarea 29). */
export interface CaptureStream {
  readonly sampleRate: number
  readonly channels: number
  /** Muestras f32 intercaladas, según llegan. */
  onData(listener: (samples: Float32Array) => void): void
  /** El stream terminó solo (dispositivo desconectado, sidecar caído...). */
  onError(listener: (reason: string) => void): void
  stop(): Promise<void>
}

/** Puerto de salida: la captura de audio del sistema (en Windows, WASAPI con `rl-capture.exe`). */
export interface AudioCapture {
  /** Abre el dispositivo predeterminado de Windows de ese tipo; falla si no hay ninguno. */
  openDefault(kind: DeviceKind): Promise<CaptureStream>
  /** Al cerrar la app: termina el proceso de captura. */
  dispose(): void
}

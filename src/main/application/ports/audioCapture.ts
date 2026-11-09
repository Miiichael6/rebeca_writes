import type { AudioApp, AudioDevice, DeviceKind } from '../../domain/capture/sidecarProtocol'

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

/** El programa pedido no está abierto: no hay de dónde capturar su audio. */
export class AppNotRunningError extends Error {}

/** Puerto de salida: la captura de audio del sistema (en Windows, WASAPI con `rl-capture.exe`). */
export interface AudioCapture {
  /** Los dispositivos activos de ese tipo. */
  listDevices(kind: DeviceKind): Promise<AudioDevice[]>
  /**
   * Abre el dispositivo `deviceId` o, si no se indica o ya no está conectado, el predeterminado
   * de Windows de ese tipo; falla si no hay ninguno.
   */
  open(kind: DeviceKind, deviceId?: string): Promise<CaptureStream>
  /** Los programas con sesión de audio ahora mismo. */
  listApps(): Promise<AudioApp[]>
  /**
   * Abre solo el audio del programa `exe` (y sus procesos hijos), sin lo demás que suene.
   * Rechaza con `AppNotRunningError` si no está abierto.
   */
  openApp(exe: string): Promise<CaptureStream>
  /** Al cerrar la app: termina el proceso de captura. */
  dispose(): void
}

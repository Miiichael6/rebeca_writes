import type { AudioCapture, CaptureStream } from '../../application/ports/audioCapture'
import type { Logger } from '../../application/ports/eventPublisher'
import type {
  AudioDevice,
  DeviceKind,
  SidecarCommand,
  SidecarEvent
} from '../../domain/capture/sidecarProtocol'
import { SidecarProcess } from './sidecarProcess'

/** El sidecar en `resources/bin` (lo deja ahí `npm run build:native`). */
export const CAPTURE_BINARY = 'rl-capture.exe'
/** Lo que se espera una respuesta del sidecar antes de darlo por colgado. */
const ANSWER_TIMEOUT_MS = 5000
/** Los ids de stream viajan en un byte de la cabecera PCM. */
const MAX_STREAM_ID = 255

interface StreamHandlers {
  data?: (samples: Float32Array) => void
  error?: (reason: string) => void
}

/** El siguiente evento que cumpla `accept`, o un rechazo pasado `ANSWER_TIMEOUT_MS`. */
interface Waiter {
  accept: (event: SidecarEvent) => boolean
  resolve: (event: SidecarEvent) => void
  reject: (error: Error) => void
}

/**
 * Adaptador de `AudioCapture` sobre `rl-capture.exe` (tarea 29, de Rebecca Listen): empareja
 * los eventos del sidecar con las peticiones que los esperan y reparte los bloques PCM a sus
 * streams.
 */
export class SidecarAudioCapture implements AudioCapture {
  private waiters: Waiter[] = []
  private readonly streams = new Map<number, StreamHandlers>()
  private nextStreamId = 1
  private readonly process: SidecarProcess

  constructor(
    binaryPath: string,
    private readonly log: Logger
  ) {
    this.process = new SidecarProcess(
      binaryPath,
      {
        event: (event) => this.handleEvent(event),
        pcm: (block) => this.streams.get(block.streamId)?.data?.(block.samples),
        ended: (reason) => this.dropPending(reason)
      },
      log
    )
  }

  async listDevices(kind: DeviceKind): Promise<AudioDevice[]> {
    return (await this.allDevices()).filter((d) => d.kind === kind)
  }

  async open(kind: DeviceKind, deviceId?: string): Promise<CaptureStream> {
    const devices = await this.listDevices(kind)
    const chosen = deviceId ? devices.find((d) => d.id === deviceId) : undefined
    if (deviceId && !chosen) {
      this.log.warn(`Captura: ${deviceId} no está conectado; se usa el predeterminado`)
    }
    const device = chosen ?? devices.find((d) => d.isDefault)
    if (!device) throw new Error(`No hay dispositivo predeterminado de tipo ${kind}`)
    this.log.info(`Captura: se abre "${device.name} (${device.groupName})" (${kind})`)
    return this.openDevice(device)
  }

  dispose(): void {
    this.process.dispose()
  }

  private async allDevices(): Promise<AudioDevice[]> {
    const event = await this.request(
      { cmd: 'list' },
      (e) => e.type === 'devices' || e.type === 'error'
    )
    if (event.type !== 'devices') throw new Error(`No se pudieron listar los dispositivos`)
    return event.devices
  }

  private async openDevice(device: AudioDevice): Promise<CaptureStream> {
    const streamId = this.nextStreamId
    this.nextStreamId = (this.nextStreamId % MAX_STREAM_ID) + 1
    const handlers: StreamHandlers = {}
    this.streams.set(streamId, handlers)

    const event = await this.request(
      { cmd: 'open', streamId, deviceId: device.id, kind: device.kind },
      (e) => (e.type === 'opened' || e.type === 'stream_error') && e.streamId === streamId
    ).catch((error: Error) => {
      this.streams.delete(streamId)
      throw error
    })
    if (event.type !== 'opened') {
      this.streams.delete(streamId)
      throw new Error(event.type === 'stream_error' ? event.message : 'No se pudo abrir')
    }

    return {
      sampleRate: event.sampleRate,
      channels: event.channels,
      onData: (listener) => {
        handlers.data = listener
      },
      onError: (listener) => {
        handlers.error = listener
      },
      stop: async () => {
        if (!this.streams.has(streamId)) return
        await this.request(
          { cmd: 'stop', streamId },
          (e) => e.type === 'stopped' && e.streamId === streamId
        ).finally(() => this.streams.delete(streamId))
      }
    }
  }

  private request(command: SidecarCommand, accept: Waiter['accept']): Promise<SidecarEvent> {
    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        accept,
        resolve: (event) => {
          clearTimeout(timer)
          resolve(event)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        }
      }
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w !== waiter)
        reject(new Error(`El sidecar de captura no respondió a ${command.cmd}`))
      }, ANSWER_TIMEOUT_MS)
      this.waiters.push(waiter)
      try {
        this.process.send(command)
      } catch (error) {
        this.waiters = this.waiters.filter((w) => w !== waiter)
        waiter.reject(error as Error)
      }
    })
  }

  /** El proceso murió: nada de lo que estaba haciendo va a responder. */
  private dropPending(reason: string): void {
    for (const waiter of this.waiters) waiter.reject(new Error(`El sidecar terminó: ${reason}`))
    this.waiters = []
    for (const handlers of this.streams.values()) handlers.error?.('sidecar_ended')
    this.streams.clear()
  }

  private handleEvent(event: SidecarEvent): void {
    const waiter = this.waiters.find((w) => w.accept(event))
    if (waiter) {
      this.waiters = this.waiters.filter((w) => w !== waiter)
      waiter.resolve(event)
      return
    }
    switch (event.type) {
      case 'warning':
        this.log.warn(`Captura: ${event.message}`)
        break
      case 'stream_error':
        this.log.warn(
          `Captura: el stream ${event.streamId} falló (${event.reason}): ${event.message}`
        )
        this.streams.get(event.streamId)?.error?.(event.reason)
        this.streams.delete(event.streamId)
        break
      case 'error':
        this.log.warn(`Captura: error ${event.code}: ${event.message}`)
        break
      default:
        break
    }
  }
}

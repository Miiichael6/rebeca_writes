import { IpcChannel } from '@shared/ipc'
import {
  sourceDevices,
  type MicDevice,
  type MicStartResult,
  type MicState,
  type MonitorLevel,
  type RecordingSource
} from '@shared/recording'
import { LevelMeter } from '../domain/capture/levelMeter'
import { Pcm16kConverter } from '../domain/capture/pcm16k'
import { microphoneName } from '../domain/capture/sidecarProtocol'
import { LiveBusyError, type LiveControl } from './liveControl'
import type { AudioCapture, CaptureStream } from './ports/audioCapture'
import type { EventPublisher, Logger } from './ports/eventPublisher'
import type { PcmWriter, RecordingEncoder, RecordingFiles } from './ports/recordingFiles'
import { followDefaultOutput, openRecordingSource, withLoopbackSilence } from './recordingSources'

export interface MicRecordingDeps {
  capture: AudioCapture
  files: RecordingFiles
  encoder: RecordingEncoder
  live: Pick<LiveControl, 'handle' | 'recordingOrigin'>
  /** Carpeta de las grabaciones finales, según Configuración. */
  recordingsDir: () => string
  /** Micrófono elegido en el menú; vacío = el predeterminado de Windows. */
  micId: () => string
  publisher: EventPublisher
  log: Logger
}

interface Recording {
  source: RecordingSource
  name: string
  startedAt: number
  stream: CaptureStream
  pcm: string
  writer: PcmWriter
  converter: Pcm16kConverter
}

/**
 * Grabar desde la app (tarea 29). Escribe el `.pcm` que transcribe la sesión en vivo de la
 * tarea 27, igual que haría Rebecca Listen, y al parar lo deja como MP3 en la carpeta de
 * grabaciones. Las órdenes van de una en una: un "parar" pulsado mientras arranca espera.
 */
export class MicRecording {
  private recording: Recording | null = null
  /** Lo abierto solo para los medidores del menú (sin grabar). */
  private monitor: CaptureStream[] = []
  private last: Promise<unknown> = Promise.resolve()
  private readonly listeners = new Set<(state: MicState) => void>()

  constructor(private readonly deps: MicRecordingDeps) {}

  /** Avisa al empezar y al terminar cada grabación (el dock, tarea 30). Devuelve la baja. */
  onStateChange(listener: (state: MicState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  state(): MicState {
    const r = this.recording
    return r ? { recording: true, source: r.source, startedAt: r.startedAt } : { recording: false }
  }

  /** `name` es el de la entrada, ya traducido por el renderer. */
  start(source: RecordingSource, name: string): Promise<MicStartResult> {
    return this.serial(() => this.begin(source, name))
  }

  stop(): Promise<void> {
    return this.serial(() => this.finish(false))
  }

  /** Los micrófonos conectados, para el menú del botón de grabar. */
  async microphones(): Promise<MicDevice[]> {
    const devices = await this.deps.capture.listDevices('capture')
    return devices.map((d) => ({ id: d.id, name: microphoneName(d), isDefault: d.isDefault }))
  }

  /**
   * Medidores del menú: abre los dispositivos de `source` (el sonido del sistema y/o `micId`,
   * vacío = el predeterminado) solo para emitir su nivel por `mic:monitorLevel`, sin grabar.
   * Cambiar de fuente o de micrófono es volver a llamarlo. Si uno no se puede abrir, el otro
   * mide igual.
   */
  startMonitor(source: RecordingSource, micId: string): Promise<void> {
    return this.serial(async () => {
      await this.closeMonitor()
      if (this.recording) return
      const opened = await Promise.all(
        sourceDevices(source).map((device) =>
          device === 'system'
            ? this.openMonitor(device, async () =>
                withLoopbackSilence(await followDefaultOutput(this.deps.capture))
              )
            : this.openMonitor(device, () => this.deps.capture.open('capture', micId || undefined))
        )
      )
      const streams = opened.filter((stream) => stream !== null)
      // Un `startMonitor`/`stopMonitor` posterior va detrás en la cola, así que nada lo pisa.
      this.monitor = streams
      for (const stream of streams) {
        stream.onError(() => {
          this.monitor = this.monitor.filter((s) => s !== stream)
        })
      }
    })
  }

  stopMonitor(): Promise<void> {
    return this.serial(() => this.closeMonitor())
  }

  /** Al cerrar la app: no da tiempo a convertir; la entrada queda con lo transcrito. */
  dispose(): void {
    this.recording = null
    this.monitor = []
    this.deps.capture.dispose()
  }

  private serial<T>(task: () => Promise<T>): Promise<T> {
    const run = this.last.then(task)
    this.last = run.catch(() => {})
    return run
  }

  private async begin(source: RecordingSource, name: string): Promise<MicStartResult> {
    if (this.recording) return { ok: true, state: this.state() }
    await this.closeMonitor()
    if (this.deps.live.recordingOrigin() === 'listen') return { ok: false, error: 'liveBusy' }

    let stream: CaptureStream
    try {
      const micId = this.deps.micId() || undefined
      stream = await openRecordingSource(this.deps.capture, source, micId)
    } catch (err) {
      this.deps.log.warn(`Micrófono: no se pudo abrir la fuente ${source}: ${String(err)}`)
      return { ok: false, error: 'noDevice' }
    }

    try {
      const { path: pcm, writer } = await this.deps.files.createPcm()
      const converter = new Pcm16kConverter(stream.sampleRate, stream.channels)
      const meter = new LevelMeter(stream.sampleRate, stream.channels)
      const recording = { source, name, startedAt: Date.now(), stream, pcm, writer, converter }
      stream.onData((samples) => {
        writer.append(converter.convert(samples))
        if (this.recording !== recording) return
        for (const level of meter.push(samples)) {
          this.deps.publisher.publish(IpcChannel.MicLevel, level)
        }
      })
      stream.onError((reason) => this.interrupt(reason))
      this.recording = recording
      await this.deps.live.handle({ kind: 'start', pcm, name }, 'mic').catch(async (err) => {
        this.recording = null
        await this.discard(recording)
        throw err
      })
    } catch (err) {
      await stream.stop().catch(() => {})
      if (err instanceof LiveBusyError) return { ok: false, error: 'liveBusy' }
      this.deps.log.error('Micrófono: no se pudo empezar a grabar', err)
      return { ok: false, error: 'failed' }
    }

    this.deps.log.info(
      `Micrófono: graba ${source} (${stream.sampleRate} Hz, ${stream.channels} canales)`
    )
    this.publishState()
    return { ok: true, state: this.state() }
  }

  /** Abre un dispositivo para su medidor; `null` si no se puede (se avisa en el log). */
  private async openMonitor(
    device: MonitorLevel['device'],
    open: () => Promise<CaptureStream>
  ): Promise<CaptureStream | null> {
    let stream: CaptureStream
    try {
      stream = await open()
    } catch (err) {
      this.deps.log.warn(`Micrófono: no se pudo abrir ${device} para medir: ${String(err)}`)
      return null
    }
    const meter = new LevelMeter(stream.sampleRate, stream.channels)
    stream.onData((samples) => {
      if (!this.monitor.includes(stream)) return
      for (const level of meter.push(samples)) {
        this.deps.publisher.publish(IpcChannel.MicMonitorLevel, { device, level })
      }
    })
    return stream
  }

  private async closeMonitor(): Promise<void> {
    const streams = this.monitor
    this.monitor = []
    await Promise.all(streams.map((stream) => stream.stop().catch(() => {})))
  }

  /** El dispositivo se perdió: se cierra con lo grabado hasta ahí. */
  private interrupt(reason: string): void {
    this.deps.log.warn(`Micrófono: la captura se cortó (${reason})`)
    void this.serial(() => this.finish(true))
  }

  private async finish(interrupted: boolean): Promise<void> {
    const recording = this.recording
    if (!recording) return
    this.recording = null
    this.publishState(interrupted)

    await recording.stream.stop().catch(() => {})
    recording.writer.append(recording.converter.flush())
    await recording.writer.close()
    const media = await this.saveMp3(recording)
    await this.deps.live.handle({ kind: 'end', pcm: recording.pcm, media }, 'mic')
  }

  /** La grabación final, o `null` si no se pudo convertir (la entrada queda sin medio). */
  private async saveMp3(recording: Recording): Promise<string | null> {
    try {
      const out = await this.deps.files.freeRecordingPath(this.deps.recordingsDir(), recording.name)
      await this.deps.encoder.pcmToMp3(recording.pcm, out)
      this.deps.log.info(`Micrófono: grabación guardada en ${out}`)
      return out
    } catch (err) {
      this.deps.log.error('Micrófono: no se pudo guardar el MP3', err)
      return null
    }
  }

  /** El inicio falló después de crear el `.pcm`: se cierra y se borra. */
  private async discard(recording: Recording): Promise<void> {
    await recording.writer.close().catch(() => {})
    await this.deps.files.remove(recording.pcm).catch(() => {})
  }

  private publishState(interrupted = false): void {
    const state = this.state()
    this.deps.publisher.publish(
      IpcChannel.MicChanged,
      interrupted && !state.recording ? { ...state, interrupted } : state
    )
    for (const listener of this.listeners) listener(state)
  }
}

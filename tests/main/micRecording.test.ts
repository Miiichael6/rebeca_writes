import { describe, expect, it, vi } from 'vitest'
import { IpcChannel } from '@shared/ipc'
import type { RecordingFormat } from '@shared/recording'
import { LiveBusyError, type LiveOrigin } from '../../src/main/application/liveControl'
import { MicRecording, type MicRecordingDeps } from '../../src/main/application/micRecording'
import type { CaptureStream } from '../../src/main/application/ports/audioCapture'
import type { AudioDevice } from '../../src/main/domain/capture/sidecarProtocol'
import type { LiveCommand } from '../../src/main/domain/liveArgs'

class FakeStream implements CaptureStream {
  readonly sampleRate = 16_000
  readonly channels = 1
  stopped = false
  data: (samples: Float32Array) => void = () => {}
  error: (reason: string) => void = () => {}
  onData(listener: (samples: Float32Array) => void): void {
    this.data = listener
  }
  onError(listener: (reason: string) => void): void {
    this.error = listener
  }
  async stop(): Promise<void> {
    this.stopped = true
  }
}

const USB_MIC: AudioDevice = {
  id: 'usb',
  name: 'Micrófono',
  groupName: 'USB Audio',
  kind: 'capture',
  isDefault: false,
  channels: 1,
  sampleRate: 48_000
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- el tipo inferido conserva los `vi.fn`
function setup(
  options: {
    recordingOrigin?: LiveOrigin | null
    liveBusy?: boolean
    micId?: string
    format?: RecordingFormat
  } = {}
) {
  const stream = new FakeStream()
  const written: Buffer[] = []
  const commands: LiveCommand[] = []
  const deps = {
    capture: {
      listDevices: vi.fn(async () => [USB_MIC]),
      open: vi.fn(async () => stream),
      dispose: vi.fn()
    },
    files: {
      createPcm: vi.fn(async () => ({
        path: 'C:\\tmp\\rec.pcm',
        writer: { append: (chunk: Buffer) => written.push(chunk), close: vi.fn(async () => {}) }
      })),
      freeRecordingPath: vi.fn(
        async (dir: string, name: string, format: RecordingFormat) => `${dir}\\${name}.${format}`
      ),
      remove: vi.fn(async () => {})
    },
    encoder: { encode: vi.fn(async () => {}) },
    live: {
      handle: vi.fn(async (command: LiveCommand) => {
        if (options.liveBusy && command.kind === 'start') throw new LiveBusyError('listen')
        commands.push(command)
      }),
      recordingOrigin: () => options.recordingOrigin ?? null
    },
    recordingsDir: () => 'D:\\Grabaciones',
    format: () => options.format ?? 'mp3',
    micId: () => options.micId ?? '',
    publisher: { publish: vi.fn() },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  } satisfies MicRecordingDeps
  return { mic: new MicRecording(deps), deps, stream, written, commands }
}

describe('MicRecording', () => {
  it('graba al .pcm, lo pasa a MP3 al parar y cierra la sesión en vivo con él', async () => {
    const { mic, deps, stream, written, commands } = setup()
    const result = await mic.start('voice', 'Grabación 1')
    expect(result).toMatchObject({ ok: true, state: { recording: true, source: 'voice' } })
    expect(commands[0]).toEqual({ kind: 'start', pcm: 'C:\\tmp\\rec.pcm', name: 'Grabación 1' })

    stream.data(new Float32Array(1600).fill(0.5))
    await mic.stop()

    expect(written.reduce((sum, chunk) => sum + chunk.length, 0)).toBe(3200)
    expect(stream.stopped).toBe(true)
    expect(deps.encoder.encode).toHaveBeenCalledWith(
      'C:\\tmp\\rec.pcm',
      'D:\\Grabaciones\\Grabación 1.mp3',
      'mp3'
    )
    expect(commands[1]).toEqual({
      kind: 'end',
      pcm: 'C:\\tmp\\rec.pcm',
      media: 'D:\\Grabaciones\\Grabación 1.mp3'
    })
    expect(mic.state()).toEqual({ recording: false })
  })

  it('en WAV guarda la grabación como .wav', async () => {
    const { mic, deps, commands } = setup({ format: 'wav' })
    await mic.start('voice', 'Nota')
    await mic.stop()
    expect(deps.encoder.encode).toHaveBeenCalledWith(
      'C:\\tmp\\rec.pcm',
      'D:\\Grabaciones\\Nota.wav',
      'wav'
    )
    expect(commands.at(-1)).toMatchObject({ kind: 'end', media: 'D:\\Grabaciones\\Nota.wav' })
  })

  it('no empieza mientras graba Listen, y no llega a abrir el dispositivo', async () => {
    const { mic, deps } = setup({ recordingOrigin: 'listen' })
    expect(await mic.start('both', 'x')).toEqual({ ok: false, error: 'liveBusy' })
    expect(deps.capture.open).not.toHaveBeenCalled()
  })

  it('si Listen empieza justo antes, cierra el dispositivo y borra el .pcm', async () => {
    const { mic, deps, stream } = setup({ liveBusy: true })
    expect(await mic.start('voice', 'x')).toEqual({ ok: false, error: 'liveBusy' })
    expect(stream.stopped).toBe(true)
    expect(deps.files.remove).toHaveBeenCalledWith('C:\\tmp\\rec.pcm')
    expect(mic.state()).toEqual({ recording: false })
  })

  it('abre el micrófono elegido en el menú', async () => {
    const { mic, deps } = setup({ micId: 'usb' })
    await mic.start('voice', 'x')
    expect(deps.capture.open).toHaveBeenCalledWith('capture', 'usb')
  })

  it('lista los micrófonos con el nombre que muestra Windows', async () => {
    const { mic } = setup()
    expect(await mic.microphones()).toEqual([
      { id: 'usb', name: 'Micrófono (USB Audio)', isDefault: false }
    ])
  })

  it('sin dispositivo devuelve noDevice', async () => {
    const { mic, deps } = setup()
    deps.capture.open.mockRejectedValueOnce(new Error('sin micrófono'))
    expect(await mic.start('voice', 'x')).toEqual({ ok: false, error: 'noDevice' })
  })

  it('si se pierde el dispositivo cierra con lo grabado y avisa', async () => {
    const { mic, deps, stream, commands } = setup()
    await mic.start('voice', 'Corte')
    stream.error('device_lost')
    await mic.stop() // espera a que termine el cierre en curso

    expect(commands.at(-1)).toMatchObject({ kind: 'end', media: 'D:\\Grabaciones\\Corte.mp3' })
    expect(deps.publisher.publish).toHaveBeenLastCalledWith(IpcChannel.MicChanged, {
      recording: false,
      interrupted: true
    })
  })

  it('si falla la conversión, la sesión se cierra sin medio', async () => {
    const { mic, deps, commands } = setup()
    deps.encoder.encode.mockRejectedValueOnce(new Error('ffmpeg'))
    await mic.start('voice', 'x')
    await mic.stop()
    expect(commands.at(-1)).toEqual({ kind: 'end', pcm: 'C:\\tmp\\rec.pcm', media: null })
  })

  it('los medidores abren el sistema y el micrófono elegido sin grabar y emiten su nivel', async () => {
    const { mic, deps, stream, written } = setup()
    await mic.startMonitor('both', 'usb')
    expect(deps.capture.open).toHaveBeenCalledWith('render')
    expect(deps.capture.open).toHaveBeenCalledWith('capture', 'usb')

    stream.data(new Float32Array(800).fill(1))
    expect(deps.publisher.publish).toHaveBeenCalledWith(IpcChannel.MicMonitorLevel, {
      device: 'voice',
      level: 1
    })
    expect(deps.publisher.publish).not.toHaveBeenCalledWith(IpcChannel.MicLevel, expect.anything())
    expect(written).toEqual([])
    expect(deps.files.createPcm).not.toHaveBeenCalled()

    await mic.stopMonitor()
    expect(stream.stopped).toBe(true)
  })

  it('si el sistema no se puede abrir, el micrófono mide igual', async () => {
    const { mic, deps, stream } = setup()
    // El sistema se abre primero.
    deps.capture.open.mockRejectedValueOnce(new Error('sin salida'))
    await mic.startMonitor('both', '')
    stream.data(new Float32Array(800).fill(1))
    expect(deps.publisher.publish).toHaveBeenCalledWith(IpcChannel.MicMonitorLevel, {
      device: 'voice',
      level: 1
    })
    expect(deps.log.warn).toHaveBeenCalled()
    await mic.stopMonitor()
  })

  it('empezar a grabar cierra los medidores', async () => {
    const { mic, deps, stream } = setup()
    await mic.startMonitor('voice', '')
    expect(deps.capture.open).toHaveBeenCalledWith('capture', undefined)
    await mic.start('voice', 'x')
    expect(stream.stopped).toBe(true)
    expect(deps.capture.open).toHaveBeenCalledTimes(2)
  })

  it('los medidores abren solo los dispositivos de la fuente elegida', async () => {
    const { mic, deps } = setup()
    await mic.startMonitor('system', 'usb')
    expect(deps.capture.open).toHaveBeenCalledTimes(1)
    expect(deps.capture.open).toHaveBeenCalledWith('render')
    await mic.startMonitor('voice', 'usb')
    expect(deps.capture.open).toHaveBeenCalledTimes(2)
    expect(deps.capture.open).toHaveBeenLastCalledWith('capture', 'usb')
    await mic.stopMonitor()
  })
})

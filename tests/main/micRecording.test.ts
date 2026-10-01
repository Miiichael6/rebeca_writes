import { describe, expect, it, vi } from 'vitest'
import { IpcChannel } from '@shared/ipc'
import { LiveBusyError, type LiveOrigin } from '../../src/main/application/liveControl'
import { MicRecording, type MicRecordingDeps } from '../../src/main/application/micRecording'
import type { CaptureStream } from '../../src/main/application/ports/audioCapture'
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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- el tipo inferido conserva los `vi.fn`
function setup(options: { recordingOrigin?: LiveOrigin | null; liveBusy?: boolean } = {}) {
  const stream = new FakeStream()
  const written: Buffer[] = []
  const commands: LiveCommand[] = []
  const deps = {
    capture: { openDefault: vi.fn(async () => stream), dispose: vi.fn() },
    files: {
      createPcm: vi.fn(async () => ({
        path: 'C:\\tmp\\rec.pcm',
        writer: { append: (chunk: Buffer) => written.push(chunk), close: vi.fn(async () => {}) }
      })),
      freeRecordingPath: vi.fn(async (dir: string, name: string) => `${dir}\\${name}.mp3`),
      remove: vi.fn(async () => {})
    },
    encoder: { pcmToMp3: vi.fn(async () => {}) },
    live: {
      handle: vi.fn(async (command: LiveCommand) => {
        if (options.liveBusy && command.kind === 'start') throw new LiveBusyError('listen')
        commands.push(command)
      }),
      recordingOrigin: () => options.recordingOrigin ?? null
    },
    recordingsDir: () => 'D:\\Grabaciones',
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
    expect(deps.encoder.pcmToMp3).toHaveBeenCalledWith(
      'C:\\tmp\\rec.pcm',
      'D:\\Grabaciones\\Grabación 1.mp3'
    )
    expect(commands[1]).toEqual({
      kind: 'end',
      pcm: 'C:\\tmp\\rec.pcm',
      media: 'D:\\Grabaciones\\Grabación 1.mp3'
    })
    expect(mic.state()).toEqual({ recording: false })
  })

  it('no empieza mientras graba Listen, y no llega a abrir el dispositivo', async () => {
    const { mic, deps } = setup({ recordingOrigin: 'listen' })
    expect(await mic.start('both', 'x')).toEqual({ ok: false, error: 'liveBusy' })
    expect(deps.capture.openDefault).not.toHaveBeenCalled()
  })

  it('si Listen empieza justo antes, cierra el dispositivo y borra el .pcm', async () => {
    const { mic, deps, stream } = setup({ liveBusy: true })
    expect(await mic.start('voice', 'x')).toEqual({ ok: false, error: 'liveBusy' })
    expect(stream.stopped).toBe(true)
    expect(deps.files.remove).toHaveBeenCalledWith('C:\\tmp\\rec.pcm')
    expect(mic.state()).toEqual({ recording: false })
  })

  it('sin dispositivo devuelve noDevice', async () => {
    const { mic, deps } = setup()
    deps.capture.openDefault.mockRejectedValueOnce(new Error('sin micrófono'))
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

  it('si falla el MP3, la sesión se cierra sin medio', async () => {
    const { mic, deps, commands } = setup()
    deps.encoder.pcmToMp3.mockRejectedValueOnce(new Error('ffmpeg'))
    await mic.start('voice', 'x')
    await mic.stop()
    expect(commands.at(-1)).toEqual({ kind: 'end', pcm: 'C:\\tmp\\rec.pcm', media: null })
  })
})

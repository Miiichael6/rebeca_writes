import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import type { Logger } from '../../application/ports/eventPublisher'
import {
  FrameDemuxer,
  LineReader,
  parseSidecarEvent,
  type PcmBlock,
  type SidecarCommand,
  type SidecarEvent
} from '../../domain/capture/sidecarProtocol'

export interface SidecarListeners {
  event: (event: SidecarEvent) => void
  pcm: (block: PcmBlock) => void
  /** El proceso terminó: se pierden las peticiones pendientes y los streams abiertos. */
  ended: (reason: string) => void
}

/**
 * El proceso `rl-capture.exe` (tarea 29): lo arranca al mandar la primera orden y separa su
 * salida en eventos (stderr) y bloques PCM (stdout). Si muere, la orden siguiente lo vuelve a
 * arrancar; solo se graba a petición del usuario, así que no hace falta reiniciarlo solo.
 */
export class SidecarProcess {
  private child: ChildProcessWithoutNullStreams | null = null

  constructor(
    private readonly binaryPath: string,
    private readonly listeners: SidecarListeners,
    private readonly log: Logger
  ) {}

  send(command: SidecarCommand): void {
    const child = this.child ?? this.start()
    child.stdin.write(`${JSON.stringify(command)}\n`)
  }

  /** Cerrar stdin hace que el sidecar termine solo. */
  dispose(): void {
    this.child?.stdin.end()
    this.child = null
  }

  private start(): ChildProcessWithoutNullStreams {
    const child = spawn(this.binaryPath, [], { windowsHide: true })
    this.log.info(`Captura: sidecar arrancado (${this.binaryPath})`)

    const demuxer = new FrameDemuxer(this.listeners.pcm)
    child.stdout.on('data', (chunk: Buffer) => demuxer.push(chunk))

    const lines = new LineReader((line) => this.handleLine(line))
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => lines.push(chunk))

    child.on('error', (error) => this.handleEnd(child, error.message))
    child.on('exit', (code) => this.handleEnd(child, `código de salida ${code}`))
    child.stdin.on('error', (error) => this.handleEnd(child, error.message))

    this.child = child
    return child
  }

  private handleLine(line: string): void {
    const event = parseSidecarEvent(line)
    if (event) this.listeners.event(event)
    else this.log.warn(`Captura: línea no válida del sidecar: ${line}`)
  }

  private handleEnd(child: ChildProcessWithoutNullStreams, reason: string): void {
    // `error` y `exit` pueden llegar los dos para el mismo proceso.
    if (this.child !== child) return
    this.child = null
    this.log.warn(`Captura: el sidecar terminó (${reason})`)
    this.listeners.ended(reason)
  }
}

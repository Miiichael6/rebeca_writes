import type { DockButton, DockQuestion, DockView } from '@shared/dock'
import type { RecordingSource } from '@shared/recording'
import { dockButtons, quitQuestion, visibleQuestion } from '../domain/dock/dockAction'
import type { MicRecording } from './micRecording'
import type { Logger } from './ports/eventPublisher'
import type { DockSurface } from './ports/dockSurface'

/** Salir del dock un momento (un pulso tembloroso) no lo esconde. */
export const HIDE_DELAY_MS = 400
/** Cada cuánto se mira dónde está el ratón mientras el dock está fuera por él. */
export const WATCH_MS = 100

export interface DockDeps {
  surface: DockSurface
  mic: Pick<MicRecording, 'state' | 'start' | 'stop'>
  /** La fuente elegida en el botón de grabar. */
  source: () => RecordingSource
  /** El menú contextual del dock está abierto: mientras lo esté, el dock no se esconde. */
  menuOpen: () => boolean
  /** Cierra la app del todo (D9). */
  quit: () => void
  log: Logger
}

/**
 * El dock en el borde (tarea 30): sale mientras el ratón está encima o mientras hace una
 * pregunta, y sus botones graban, preguntan si terminar y salen de la app (D8, D9).
 */
export class Dock {
  private question: DockQuestion | null = null
  private hovered = false
  /** Sale mientras dure la grabación que empezó el atajo de teclado (tarea 31). */
  private revealed = false
  private mouseWatch: ReturnType<typeof setInterval> | null = null

  constructor(private readonly deps: DockDeps) {}

  view(): DockView {
    const recording = this.deps.mic.state().recording
    const question = visibleQuestion(this.question, recording)
    return {
      out: this.hovered || question !== null || (this.revealed && recording),
      recording,
      question,
      ...dockButtons(question, recording)
    }
  }

  open(): void {
    this.deps.surface.open()
  }

  close(): void {
    this.stopWatching()
    this.hovered = false
    this.revealed = false
    this.question = null
    this.deps.surface.close()
  }

  /** El ratón llegó a la barra: sale y vigila cuándo se va (navegar por su menú no cuenta). */
  hover(): void {
    this.hovered = true
    this.refresh()
    if (this.mouseWatch) return
    let away = 0
    this.mouseWatch = setInterval(() => {
      const staying = this.deps.surface.cursorInside() || this.deps.menuOpen()
      away = staying ? 0 : away + WATCH_MS
      if (away < HIDE_DELAY_MS) return
      this.stopWatching()
      this.hovered = false
      this.refresh()
    }, WATCH_MS)
  }

  /**
   * Un botón de la píldora. `recordingName` es el nombre de la entrada si el botón empieza a
   * grabar, ya traducido por el renderer.
   */
  async press(button: DockButton, recordingName: string): Promise<void> {
    const action = this.view()[button]
    switch (action) {
      case 'record':
        return this.record(this.deps.source(), recordingName)
      case 'askEnd':
        return this.ask('end')
      case 'keepRecording':
      case 'stay':
        return this.ask(null)
      case 'stopAndSave':
        this.ask(null)
        return this.deps.mic.stop()
      case 'quit':
        this.ask(null)
        return this.deps.quit()
      case null:
        return
    }
  }

  /** "Salir" del menú: pregunta en la píldora antes de cerrar la app. */
  askQuit(): void {
    this.ask(quitQuestion(this.deps.mic.state().recording))
  }

  /** Empieza a grabar con `source` (🎤 o el submenú "Grabar"). */
  async record(source: RecordingSource, name: string): Promise<void> {
    const result = await this.deps.mic.start(source, name)
    if (!result.ok) this.deps.log.warn(`Dock: no se pudo empezar a grabar (${result.error})`)
  }

  /** Sale hasta que termine la grabación en curso (la empezó el atajo de teclado). */
  revealUntilStopped(): void {
    this.revealed = true
    this.refresh()
  }

  /** Vuelve a pintar el dock (p. ej. al empezar o parar una grabación). */
  refresh(): void {
    if (!this.deps.mic.state().recording) this.revealed = false
    this.deps.surface.show(this.view())
  }

  /** Una pregunta nueva retira la anterior; `null` las retira todas. */
  private ask(question: DockQuestion | null): void {
    this.question = question
    this.refresh()
  }

  private stopWatching(): void {
    if (this.mouseWatch) clearInterval(this.mouseWatch)
    this.mouseWatch = null
  }
}

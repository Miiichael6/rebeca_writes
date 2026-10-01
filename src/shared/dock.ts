import type { RecordingSource } from './recording'

/**
 * El dock en el borde de la pantalla (tarea 30): una píldora escondida en el borde derecho que
 * sale con el ratón, graba y hace preguntas de sí/no. Sin imports de `electron`: lo usa el
 * renderer.
 */

/** Pregunta en la píldora; el texto lo traduce el renderer. */
export type DockQuestion = 'end' | 'quit' | 'quitRecording'

/** Lo que hace un botón de la píldora. */
export type DockAction = 'record' | 'askEnd' | 'stopAndSave' | 'keepRecording' | 'quit' | 'stay'

export const DOCK_BUTTONS = ['left', 'right'] as const
export type DockButton = (typeof DOCK_BUTTONS)[number]

export interface DockView {
  /** Fuera, en la pantalla; si no, solo asoma la barra del borde. */
  out: boolean
  recording: boolean
  /** En el centro en vez de la onda; `null` sin pregunta. */
  question: DockQuestion | null
  /** `null`: sin botón. */
  left: DockAction | null
  /** `null` mientras graba sin pregunta: el 🎤 queda de indicador, sin acción. */
  right: DockAction | null
}

/** Grabando sin pregunta, el extremo derecho muestra el 🎤 de indicador, sin acción. */
export function dockShowsIndicator(view: DockView): boolean {
  return view.right === null && view.recording
}

/** Lo elegido en el menú contextual del dock. */
export type DockMenuAction =
  | { kind: 'open' }
  /** `name` es el de la entrada, ya traducido. */
  | { kind: 'record'; source: RecordingSource; name: string }
  | { kind: 'stop' }
  | { kind: 'quit' }
  /** Esc, clic fuera o tras elegir: el menú se esconde. */
  | { kind: 'close' }

/** Lo que ocupa el menú en su ventana, en px CSS. */
export interface DockMenuSize {
  width: number
  height: number
}

import type { RecordingSource } from './recording'

/**
 * El dock en el borde de la pantalla (tarea 30): una píldora escondida en un borde (tarea 33) que
 * sale con el ratón, graba y hace preguntas de sí/no. Sin imports de `electron`: lo usa el
 * renderer.
 */

/** Pregunta en la píldora; el texto lo traduce el renderer. */
export type DockQuestion = 'end' | 'quit' | 'quitRecording' | 'meeting'

/** Lo que hace un botón de la píldora. */
export type DockAction =
  | 'record'
  | 'askEnd'
  | 'stopAndSave'
  | 'keepRecording'
  | 'quit'
  | 'stay'
  | 'recordMeeting'
  | 'dismissMeeting'

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

/** Dónde vive el dock (tarea 33): un borde lateral, o arriba o abajo en una esquina o al centro. */
export const DOCK_POSITIONS = [
  'right',
  'left',
  'topLeft',
  'topCenter',
  'topRight',
  'bottomLeft',
  'bottomCenter',
  'bottomRight'
] as const
export type DockPosition = (typeof DOCK_POSITIONS)[number]
export const DEFAULT_DOCK_POSITION: DockPosition = 'right'

/** El borde de la pantalla en el que asoma el dock escondido. */
export type DockEdge = 'left' | 'right' | 'top' | 'bottom'
/** Dónde va a lo largo de su borde: al principio (izquierda o arriba), al centro o al final. */
export type DockAlign = 'start' | 'center' | 'end'

const PLACEMENTS: Record<DockPosition, { edge: DockEdge; align: DockAlign }> = {
  right: { edge: 'right', align: 'center' },
  left: { edge: 'left', align: 'center' },
  topLeft: { edge: 'top', align: 'start' },
  topCenter: { edge: 'top', align: 'center' },
  topRight: { edge: 'top', align: 'end' },
  bottomLeft: { edge: 'bottom', align: 'start' },
  bottomCenter: { edge: 'bottom', align: 'center' },
  bottomRight: { edge: 'bottom', align: 'end' }
}

export function dockEdge(position: DockPosition): DockEdge {
  return PLACEMENTS[position].edge
}

export function dockAlign(position: DockPosition): DockAlign {
  return PLACEMENTS[position].align
}

/**
 * Si el menú del dock se abre a la izquierda del cursor (hacia dentro de la pantalla): sí,
 * salvo con el dock en la mitad izquierda (borde izquierdo o esquinas de la izquierda).
 */
export function menuOpensLeft(position: DockPosition): boolean {
  return dockEdge(position) !== 'left' && dockAlign(position) !== 'start'
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

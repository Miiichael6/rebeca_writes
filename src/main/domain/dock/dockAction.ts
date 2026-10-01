import type { DockAction, DockQuestion } from '@shared/dock'

export interface DockButtons {
  left: DockAction | null
  right: DockAction | null
}

/**
 * Los botones de la píldora (D8). Sin grabar: solo 🎤 a la derecha. Grabando: ■ a la izquierda
 * y 🎤 de indicador. Con una pregunta: ✕ a la izquierda y ✓ a la derecha.
 */
export function dockButtons(question: DockQuestion | null, recording: boolean): DockButtons {
  switch (question) {
    case 'end':
      return { left: 'keepRecording', right: 'stopAndSave' }
    case 'quit':
    case 'quitRecording':
      return { left: 'stay', right: 'quit' }
    case null:
      return recording ? { left: 'askEnd', right: null } : { left: null, right: 'record' }
  }
}

/** "¿Terminar?" solo tiene sentido mientras graba: si se paró por otro lado, se retira. */
export function visibleQuestion(
  question: DockQuestion | null,
  recording: boolean
): DockQuestion | null {
  return question === 'end' && !recording ? null : question
}

/** "¿Salir?" avisa de que la grabación en curso se guardará antes de salir. */
export function quitQuestion(recording: boolean): DockQuestion {
  return recording ? 'quitRecording' : 'quit'
}

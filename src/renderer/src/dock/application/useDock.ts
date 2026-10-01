import { useEffect, useState } from 'react'
import type { DockButton, DockView } from '@shared/dock'

export interface DockModel {
  view: DockView
  /** `recordingName` por si el botón empieza a grabar. */
  press: (button: DockButton, recordingName: string) => void
  hover: () => void
  openMenu: () => void
}

/** Escondido y sin botones hasta que el main diga cómo está. */
const HIDDEN: DockView = { out: false, recording: false, question: null, left: null, right: null }

/** Lo que hace la ventana del dock: sigue la vista del main y le manda el ratón y los botones. */
export function useDock(): DockModel {
  const [view, setView] = useState<DockView>(HIDDEN)

  useEffect(() => {
    void window.api.dock.get().then(setView)
    return window.api.dock.onView(setView)
  }, [])

  return {
    view,
    press: (button, recordingName) => void window.api.dock.press(button, recordingName),
    hover: () => void window.api.dock.hover(),
    openMenu: () => void window.api.dock.openMenu()
  }
}

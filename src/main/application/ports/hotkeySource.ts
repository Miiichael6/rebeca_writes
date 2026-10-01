import type { HotkeyStatus } from '@shared/shortcut'
import type { HotkeyCombo } from '../../domain/hotkey/accelerator'
import type { HotkeyInput } from '../../domain/hotkey/gesture'

/** Lo que llega del teclado: la combinación se completa, se suelta o se mezcla con otra tecla. */
export type HotkeyKeyEvent = Exclude<HotkeyInput, 'timer'>

export interface HotkeySourceListeners {
  key: (event: HotkeyKeyEvent) => void
  status: (status: HotkeyStatus) => void
}

/** Puerto de salida: el teclado global (en Windows, el gancho de `rl-hotkey.exe`, tarea 31). */
export interface HotkeySource {
  listen(listeners: HotkeySourceListeners): void
  /** Vigila `combo` en todo el sistema; `null` deja de vigilar. */
  watch(combo: HotkeyCombo | null): void
  /** Al cerrar la app: no queda nada vigilando. */
  dispose(): void
}

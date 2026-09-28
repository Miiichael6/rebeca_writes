import { create } from 'zustand'

export interface ToastAction {
  label: string
  onSelect: () => void
}

export interface Toast {
  id: number
  message: string
  /** Botón dentro del aviso (p. ej. "Mostrar en el Explorador"). */
  action?: ToastAction
}

interface ToastState {
  toasts: Toast[]
  dismiss: (id: number) => void
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
}))

let nextId = 1

/**
 * Muestra un aviso no bloqueante (p. ej. "Copiado") que desaparece solo. Con `action`, el
 * aviso lleva un botón y dura más para dar tiempo a pulsarlo.
 */
export function toast(message: string, durationMs = 2500, action?: ToastAction): void {
  const id = nextId++
  useToastStore.setState((s) => ({ toasts: [...s.toasts, { id, message, action }] }))
  setTimeout(() => useToastStore.getState().dismiss(id), durationMs)
}

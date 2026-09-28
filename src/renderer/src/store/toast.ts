import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
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

/** Muestra un aviso no bloqueante (p. ej. "Copiado") que desaparece solo. */
export function toast(message: string, durationMs = 2500): void {
  const id = nextId++
  useToastStore.setState((s) => ({ toasts: [...s.toasts, { id, message }] }))
  setTimeout(() => useToastStore.getState().dismiss(id), durationMs)
}

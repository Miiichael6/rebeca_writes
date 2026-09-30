import { SCROLL_KEYS } from './constants'

/** Lo que se necesita de un evento de teclado; lo cumplen el de React y el del DOM. */
interface KeyInput {
  key: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}

/** Ctrl + letra, sin ningún otro modificador. */
function isPlainCtrl(e: KeyInput, letter: string): boolean {
  return e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey && e.key.toLowerCase() === letter
}

export const isFindShortcut = (e: KeyInput): boolean => isPlainCtrl(e, 'f')

export const isCopyShortcut = (e: KeyInput): boolean => isPlainCtrl(e, 'c')

/** Tecla con la que se desplaza la lista a mano. Ctrl y Alt las reservan otros atajos. */
export function isScrollKey(e: Pick<KeyInput, 'key' | 'ctrlKey' | 'altKey'>): boolean {
  return SCROLL_KEYS.has(e.key) && !e.ctrlKey && !e.altKey
}

import { useEffect } from 'react'
import { usePorts } from './ports'

/** `Esc` vuelve a la pantalla principal, salvo que haya un diálogo abierto. */
export function useEscapeToLeave(): void {
  const { navigation } = usePorts()
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) navigation.backToMain()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigation])
}

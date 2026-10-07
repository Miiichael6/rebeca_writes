import { useEffect, useRef, useState } from 'react'
import { MOTION_SLOW, motionDuration } from '@renderer/lib/motion'
import type { MenuItemMotion } from '../../ui'
import { usePorts } from './ports'

export interface FavoriteCopy {
  code: string
  /** Entra (se expande) recién marcada o sale (se pliega) recién desmarcada. */
  motion: MenuItemMotion
}

export interface FavoriteLanguages {
  /** Marcado con estrella; uno que se está desmarcando ya cuenta como no favorito. */
  isFavorite: (code: string) => boolean
  /** Copias del bloque de favoritos, incluida la que aún se está plegando al salir. */
  copies: FavoriteCopy[]
  toggle: (code: string) => void
}

/**
 * Idiomas favoritos con su animación: el recién marcado entra expandiéndose y el desmarcado sigue
 * en la lista mientras se pliega; solo después se quita de la configuración.
 */
export function useFavoriteLanguages(): FavoriteLanguages {
  const { settings } = usePorts()
  const { favoriteLanguages } = settings.useChoice()
  const [entering, setEntering] = useState<string | null>(null)
  const [leaving, setLeaving] = useState<string[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  // Lo guardado al acabar de plegarse, que puede haber cambiado mientras tanto.
  const latest = useRef(favoriteLanguages)

  useEffect(() => {
    latest.current = favoriteLanguages
  }, [favoriteLanguages])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  const later = (code: string, fn: () => void): void => {
    clearTimeout(timers.current.get(code))
    timers.current.set(code, setTimeout(fn, motionDuration(MOTION_SLOW)))
  }

  const toggle = (code: string): void => {
    if (leaving.includes(code)) {
      // Vuelto a marcar mientras se plegaba: se queda.
      clearTimeout(timers.current.get(code))
      setLeaving((l) => l.filter((c) => c !== code))
    } else if (favoriteLanguages.includes(code)) {
      setLeaving((l) => [...l, code])
      later(code, () => {
        settings.setFavoriteLanguages(latest.current.filter((c) => c !== code))
        setLeaving((l) => l.filter((c) => c !== code))
      })
    } else {
      settings.setFavoriteLanguages([...favoriteLanguages, code])
      setEntering(code)
      later(code, () => setEntering((e) => (e === code ? null : e)))
    }
  }

  return {
    isFavorite: (code) => favoriteLanguages.includes(code) && !leaving.includes(code),
    copies: favoriteLanguages.map((code) => ({
      code,
      motion: leaving.includes(code) ? 'exit' : entering === code ? 'enter' : 'idle'
    })),
    toggle
  }
}

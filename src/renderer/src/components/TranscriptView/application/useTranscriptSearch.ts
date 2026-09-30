import { useCallback, useEffect, useState } from 'react'
import type { Segment } from '@shared/types'
import { updateSearch, type SearchMatch, type SearchResult } from '@renderer/lib/search'
import { SEARCH_DEBOUNCE_MS } from '../domain/constants'
import { clampCursor, firstCursor, stepCursor } from '../domain/searchCursor'

export interface TranscriptSearch {
  query: string
  setQuery: (query: string) => void
  /** Busca ya lo escrito, sin esperar al debounce. Devuelve `false` si no hacía falta. */
  flush: () => boolean
  /** Consulta con la que se calcularon `matches`. */
  searched: string
  matches: readonly SearchMatch[]
  /** Índice de la coincidencia actual, o -1 si no hay. */
  current: number
  /** Coincidencia siguiente (+1) o anterior (-1), con vuelta al principio o al final. */
  step: (delta: 1 | -1) => void
}

/**
 * Estado de la búsqueda. Las coincidencias se recalculan al cambiar la consulta (con debounce)
 * o los segmentos; durante la transcripción solo se busca en los que llegan (`updateSearch`).
 */
export function useTranscriptSearch(segments: Segment[]): TranscriptSearch {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState('')
  const [result, setResult] = useState<SearchResult>(() => updateSearch(null, segments, ''))
  const [current, setCurrent] = useState(-1)

  useEffect(() => {
    const id = setTimeout(() => setSearched(query), query.trim() ? SEARCH_DEBOUNCE_MS : 0)
    return () => clearTimeout(id)
  }, [query])

  // Estado derivado de props ajustado durante el render (patrón recomendado por React).
  if (result.segments !== segments || result.query !== searched) {
    const next = updateSearch(result, segments, searched)
    setResult(next)
    if (next.query !== result.query) {
      // Consulta nueva: a la primera coincidencia.
      setCurrent(firstCursor(next.matches.length))
    } else if (next.matches !== result.matches) {
      // Llegaron segmentos o cambió la lista: se conserva la actual si sigue existiendo.
      setCurrent((c) => clampCursor(c, next.matches.length))
    }
  }

  const count = result.matches.length
  const step = useCallback(
    (delta: 1 | -1) => {
      if (count === 0) return
      setCurrent((c) => stepCursor(c, delta, count))
    },
    [count]
  )

  const flush = (): boolean => {
    if (query === searched) return false
    setSearched(query)
    return true
  }

  return { query, setQuery, flush, searched, matches: result.matches, current, step }
}

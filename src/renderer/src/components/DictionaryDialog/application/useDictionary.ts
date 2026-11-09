import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLatest } from '@renderer/lib/useLatest'
import type { DictionaryEntry } from '@shared/dictionary'
import { emptyEntry, savableEntries } from '../domain/entries'
import { usePorts } from './ports'

/** Espera tras el último cambio antes de guardar, como el resto de Configuración. */
const SAVE_DELAY_MS = 500

export interface DictionaryModel {
  entries: DictionaryEntry[]
  loaded: boolean
  /** Id de la última palabra añadida (su fila se enfoca). */
  addedId: string | null
  add: () => void
  change: (entry: DictionaryEntry) => void
  remove: (id: string) => void
  /** Reemplaza la lista entera (al importar). */
  replaceAll: (entries: DictionaryEntry[]) => void
}

/**
 * La lista del diccionario mientras el diálogo está abierto. Se lee al abrir y cada cambio se
 * guarda solo tras un momento; las filas a medio rellenar se quedan en la tabla pero no se
 * guardan. Al cerrar se guarda lo pendiente.
 */
export function useDictionary(open: boolean): DictionaryModel {
  const { t } = useTranslation()
  const { dictionary, feedback } = usePorts()
  const [entries, setEntries] = useState<DictionaryEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [addedId, setAddedId] = useState<string | null>(null)
  const pending = useRef<DictionaryEntry[] | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const toSave = pending.current
    pending.current = null
    if (!toSave) return
    dictionary.save(savableEntries(toSave)).catch((err: unknown) => {
      console.error('No se pudo guardar el diccionario', err)
      feedback.toast(t('dictionary.saveFailed'))
    })
  }, [dictionary, feedback, t])

  useEffect(() => {
    if (!open) return
    let alive = true
    dictionary
      .load()
      .then((list) => {
        if (!alive) return
        setEntries(list)
        setLoaded(true)
      })
      .catch((err: unknown) => console.error('No se pudo leer el diccionario', err))
    return () => {
      alive = false
      flush()
      // Al cerrar queda listo para la próxima vez: sin lista vieja ni fila que enfocar.
      setLoaded(false)
      setAddedId(null)
    }
  }, [open, dictionary, flush])

  const latestFlush = useLatest(flush)
  /** Cambia la lista a partir de la actual y programa el guardado. */
  const update = useCallback(
    (change: (current: DictionaryEntry[]) => DictionaryEntry[]) => {
      setEntries((current) => {
        const next = change(current)
        pending.current = next
        return next
      })
      clearTimeout(timer.current)
      timer.current = setTimeout(() => latestFlush.current(), SAVE_DELAY_MS)
    },
    [latestFlush]
  )

  return {
    entries,
    loaded,
    addedId,
    add: () => {
      const entry = emptyEntry(feedback.createId())
      setAddedId(entry.id)
      update((current) => [...current, entry])
    },
    change: (entry) => update((current) => current.map((e) => (e.id === entry.id ? entry : e))),
    remove: (id) => update((current) => current.filter((e) => e.id !== id)),
    replaceAll: (next) => update(() => next)
  }
}

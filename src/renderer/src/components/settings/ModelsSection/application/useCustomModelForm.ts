import { useState } from 'react'
import type { ModelErrorCode } from '@shared/models'
import { defaultCustomName } from '../domain/model'
import { usePorts } from './ports'

export interface CustomModelForm {
  path: string | null
  name: string
  error: string | null
  canSubmit: boolean
  setName: (name: string) => void
  reset: () => void
  pick: () => Promise<void>
  /** Añade el modelo; si sale bien llama a `onDone`. */
  submit: (onDone: () => void) => Promise<void>
}

/** Formulario de «añadir modelo propio». `errorMessage` traduce el código de error. */
export function useCustomModelForm(
  errorMessage: (code: ModelErrorCode) => string
): CustomModelForm {
  const { models } = usePorts()
  const [path, setPath] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  return {
    path,
    name,
    error,
    canSubmit: path !== null,
    setName,
    reset: () => {
      setPath(null)
      setName('')
      setError(null)
    },
    pick: async () => {
      const file = await models.pickCustomFile()
      if (!file) return
      setPath(file)
      setError(null)
      if (!name) setName(defaultCustomName(file))
    },
    submit: async (onDone) => {
      if (!path) return
      const result = await models.addCustom(path, name)
      if (result.ok) onDone()
      else setError(errorMessage(result.code))
    }
  }
}

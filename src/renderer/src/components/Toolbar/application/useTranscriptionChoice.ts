import { useEffect, useMemo } from 'react'
import { whisperLanguageOptions } from '@renderer/lib/languages'
import { fallbackModel, hasModel, modelOptions, MORE_MODELS, type Option } from '../domain/toolbar'
import { usePorts } from './ports'

export interface Choice {
  value: string
  options: Option[]
  onChange: (value: string) => void
}

interface ModelLabels {
  noModels: string
  moreModels: string
}

/** Combo de modelos. Si el elegido ya no está descargado, pasa al primero que sí lo esté. */
export function useModelChoice(labels: ModelLabels): Choice & { available: boolean } {
  const { settings, models, view } = usePorts()
  const { model } = settings.useChoice()
  const downloaded = models.useDownloaded()
  const loaded = models.useLoaded()

  useEffect(() => {
    const next = fallbackModel(loaded, downloaded, model)
    if (next !== null) settings.setModel(next)
  }, [loaded, downloaded, model, settings])

  const available = hasModel(downloaded, model)
  const { noModels, moreModels } = labels
  const options = useMemo(
    () => modelOptions(downloaded, available, { noModels, moreModels }),
    [downloaded, available, noModels, moreModels]
  )

  return {
    available,
    value: available ? model : '',
    options,
    onChange: (value) => {
      if (value === MORE_MODELS) view.openSettings()
      else if (value) settings.setModel(value)
    }
  }
}

/** Combo de idiomas de Whisper, con los nombres en el idioma de la interfaz. */
export function useLanguageChoice(uiLanguage: string, autoLabel: string): Choice {
  const { settings } = usePorts()
  const { language } = settings.useChoice()
  const options = useMemo(
    () => whisperLanguageOptions(uiLanguage, autoLabel),
    [uiLanguage, autoLabel]
  )
  return { value: language, options, onChange: settings.setLanguage }
}

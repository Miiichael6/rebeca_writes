import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePorts } from './ports'

export interface ApplyDictionary {
  /** Se puede aplicar ahora (hay transcripción terminada y no se está aplicando ya). */
  enabled: boolean
  apply: () => void
}

/**
 * «Aplicar diccionario» a la transcripción abierta: el main la corrige y la guarda; aquí se
 * avisa cuántos segmentos cambiaron. Se deshace segmento a segmento con «Restaurar original».
 */
export function useApplyDictionary(): ApplyDictionary {
  const { t } = useTranslation()
  const { transcript, feedback } = usePorts()
  const canApply = transcript.useCanApplyDictionary()
  const [busy, setBusy] = useState(false)

  return {
    enabled: canApply && !busy,
    apply: () => {
      setBusy(true)
      transcript
        .applyDictionary()
        .then((changed) => {
          if (changed === null) return
          feedback.toast(
            changed > 0
              ? t('bottomBar.dictionaryApplied', { count: changed })
              : t('bottomBar.dictionaryNoChanges')
          )
        })
        .catch((err: unknown) => {
          console.error('No se pudo aplicar el diccionario', err)
          feedback.toast(t('bottomBar.dictionaryFailed'))
        })
        .finally(() => setBusy(false))
    }
  }
}

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { recordingNameTemplates } from '@renderer/lib/recordingName'

/**
 * Le pasa al main los nombres de entrada traducidos, para que las grabaciones del atajo de
 * teclado (tarea 31) se llamen igual que las del dock. Se repite al cambiar de idioma.
 */
export function useRecordingNameTemplates(): void {
  const { i18n } = useTranslation()
  useEffect(() => {
    void window.api.hotkey.setNameTemplates(recordingNameTemplates())
  }, [i18n.language])
}

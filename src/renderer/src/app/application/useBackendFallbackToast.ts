import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { usePorts } from './ports'

/** Aviso no bloqueante cuando el main cae a otro backend (p. ej. "CUDA no disponible, se usó CPU"). */
export function useBackendFallbackToast(): void {
  const { t } = useTranslation()
  const { backend, notify } = usePorts()
  useEffect(
    () =>
      backend.onFallback(({ from, to }) =>
        notify.notify(
          t('backend.fallback', {
            from: t(`backend.names.${from}`),
            to: t(`backend.names.${to}`)
          }),
          5000
        )
      ),
    [backend, notify, t]
  )
}

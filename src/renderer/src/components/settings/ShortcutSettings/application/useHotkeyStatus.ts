import { useEffect, useState } from 'react'
import type { HotkeyStatus } from '@shared/shortcut'
import { usePorts } from './ports'

/** Si el atajo está vigilando, desactivado o falló al registrarse en Windows. */
export function useHotkeyStatus(): HotkeyStatus {
  const { hotkey } = usePorts()
  const [status, setStatus] = useState<HotkeyStatus>('off')

  useEffect(() => {
    hotkey.getStatus().then(setStatus, console.error)
    return hotkey.onStatus(setStatus)
  }, [hotkey])

  return status
}

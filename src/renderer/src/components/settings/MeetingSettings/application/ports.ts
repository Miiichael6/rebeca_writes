import { createContext, useContext } from 'react'

/** Puerto de salida: el ajuste de sugerir grabar las reuniones (tarea 32). */
export interface SettingsPort {
  useSuggestMeetings(): boolean
  setSuggestMeetings(enabled: boolean): void
}

export interface MeetingSettingsPorts {
  settings: SettingsPort
}

export const PortsContext = createContext<MeetingSettingsPorts | null>(null)

export function usePorts(): MeetingSettingsPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('MeetingSettings necesita un PortsContext.Provider')
  return ports
}

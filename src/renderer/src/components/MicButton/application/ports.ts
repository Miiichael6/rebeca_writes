import { createContext, useContext } from 'react'
import type { MicDevice, MicState, MonitorLevel, RecordingSource } from '@shared/recording'

/** Puerto de salida: grabar desde la app (tarea 29). */
export interface MicPort {
  useState(): MicState
  /** Esperando la respuesta del main a empezar o parar. */
  usePending(): boolean
  /** Hay una sesión en vivo (de Listen o una grabación que aún termina de transcribirse). */
  useLiveSession(): boolean
  /** Fuente elegida en el menú (se recuerda entre sesiones). */
  useSource(): RecordingSource
  setSource(source: RecordingSource): void
  /** Micrófono elegido; vacío = el predeterminado de Windows. */
  useMicId(): string
  setMicId(id: string): void
  /** Los micrófonos conectados ahora mismo. */
  listMicrophones(): Promise<MicDevice[]>
  /** Nivel (0..1) de lo que se graba, cada 50 ms. Devuelve la baja. */
  onLevel(listener: (level: number) => void): () => void
  /** Niveles de los medidores del menú mientras se mide. Devuelve la baja. */
  onMonitorLevel(listener: (level: MonitorLevel) => void): () => void
  /** Abre el sonido del sistema y el micrófono (vacío = predeterminado) solo para medirlos. */
  startMonitor(source: RecordingSource, micId: string): void
  stopMonitor(): void
  start(source: RecordingSource, name: string): void
  stop(): void
}

export interface MicButtonPorts {
  mic: MicPort
}

export const PortsContext = createContext<MicButtonPorts | null>(null)

export function usePorts(): MicButtonPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('MicButton necesita un PortsContext.Provider')
  return ports
}

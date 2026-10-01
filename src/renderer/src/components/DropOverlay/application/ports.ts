import { createContext, useContext } from 'react'

/** Puerto de salida: lo que se hace con los archivos soltados en la ventana. */
export interface DropPort {
  /** Agrega los archivos y carpetas soltados a la cola y avisa del resultado. */
  addToQueue(files: File[]): Promise<void>
}

export interface DropOverlayPorts {
  drops: DropPort
}

export const PortsContext = createContext<DropOverlayPorts | null>(null)

export function usePorts(): DropOverlayPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('DropOverlay necesita un PortsContext.Provider')
  return ports
}

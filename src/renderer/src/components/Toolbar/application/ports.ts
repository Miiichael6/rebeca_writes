import { createContext, useContext } from 'react'
import type { TranscriptStatus } from '@shared/types'
import type { Blocker } from '../domain/toolbar'

export interface TranscriptionChoice {
  model: string
  language: string
  favoriteLanguages: string[]
  /** Filtro de voz de whisper (`--vad`). */
  vad: boolean
}

/** Puerto de salida: lo que se elige para transcribir (se recuerda entre sesiones). */
export interface SettingsPort {
  useChoice(): TranscriptionChoice
  setModel(model: string): void
  setLanguage(language: string): void
  setFavoriteLanguages(languages: string[]): void
  setVad(vad: boolean): void
}

export interface DownloadedModel {
  id: string
  label: string
}

export interface ModelsPort {
  useDownloaded(): DownloadedModel[]
  /** `true` cuando ya llegó la lista de modelos. */
  useLoaded(): boolean
}

/** Puerto de salida: el archivo abierto y su transcripción. */
export interface TranscriptionPort {
  useStatus(): TranscriptStatus
  useBlocker(): Blocker
  /** Lee en el momento si hay segmentos editados a mano. */
  hasEditedSegments(): boolean
  start(): void
  cancel(): void
}

/** Puerto de salida: paneles y pantallas. */
export interface ViewPort {
  useVideoVisible(): boolean
  /** El video tapa la transcripción, que pasa a una ventanita. */
  useTranscriptCovered(): boolean
  useTranscriptWindowOpen(): boolean
  toggleVideo(): void
  toggleTranscriptWindow(): void
  openSettings(): void
}

export interface ToolbarPorts {
  settings: SettingsPort
  models: ModelsPort
  transcription: TranscriptionPort
  view: ViewPort
}

export const PortsContext = createContext<ToolbarPorts | null>(null)

export function usePorts(): ToolbarPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('Toolbar necesita un PortsContext.Provider')
  return ports
}

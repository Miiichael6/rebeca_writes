import { createContext, useContext } from 'react'
import type { MicState, RecordingSource } from '@shared/recording'
import type { TranscriptStatus } from '@shared/types'
import type { Blocker } from '../domain/toolbar'

export interface TranscriptionChoice {
  model: string
  language: string
  translate: boolean
}

/** Puerto de salida: lo que se elige para transcribir (se recuerda entre sesiones). */
export interface SettingsPort {
  useChoice(): TranscriptionChoice
  setModel(model: string): void
  setLanguage(language: string): void
  setTranslate(translate: boolean): void
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
  start(source: RecordingSource, name: string): void
  stop(): void
}

export interface ToolbarPorts {
  settings: SettingsPort
  models: ModelsPort
  transcription: TranscriptionPort
  view: ViewPort
  mic: MicPort
}

export const PortsContext = createContext<ToolbarPorts | null>(null)

export function usePorts(): ToolbarPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('Toolbar necesita un PortsContext.Provider')
  return ports
}

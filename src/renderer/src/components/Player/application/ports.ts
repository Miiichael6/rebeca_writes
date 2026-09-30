import { createContext, useContext } from 'react'
import type { HistoryEntry, OpenedMedia } from '@shared/types'
import type { Playback } from '@renderer/lib/preview'
import type { PlaybackRate, PlayerSource } from '@renderer/store/player'

export interface TransportState {
  /** URL `media://` que suena, o `null` si no hay ninguna. */
  src: string | null
  hasVideo: boolean
  playing: boolean
  /** 0–1. */
  volume: number
  muted: boolean
  rate: PlaybackRate
}

/** Puerto de salida: el reproductor (un único `<video>` gobernado desde fuera). */
export interface PlaybackPort {
  useTransport(): TransportState
  useCurrentTime(): number
  useDuration(): number
  /** Texto del segmento que suena, o `null` en los silencios. */
  useCaption(): string | null
  rates: readonly PlaybackRate[]
  skipSeconds: number
  load(source: PlayerSource | null): void
  /** Registra el `<video>` y engancha sus eventos. Devuelve cómo soltarlo. */
  bindElement(element: HTMLVideoElement): () => void
  toggle(): void
  seek(time: number): void
  skip(delta: number): void
  setVolume(volume: number): void
  toggleMute(): void
  setRate(rate: PlaybackRate): void
}

/** Puerto de salida: la entrada abierta y su archivo. */
export interface LibraryPort {
  useEntry(): HistoryEntry | null
  /** `undefined` mientras no se sabe; `null` si no hay archivo asociado. */
  useMedia(entryId: string | undefined): OpenedMedia | null | undefined
  /** Qué tiene que sonar según el estado de la vista previa. */
  usePlayback(media: OpenedMedia | null | undefined): Playback | null
  locateFile(entryId: string): Promise<void>
}

/** Puerto de salida: los ajustes que el reproductor lee y cambia. */
export interface SettingsPort {
  useVideoHeight(): number
  useShowCaptions(): boolean
  setVideoHeight(height: number): void
  setShowCaptions(show: boolean): void
}

/** Puerto de salida: el resto de la ventana. */
export interface ViewPort {
  useVideoVisible(): boolean
  setTranscriptCovered(covered: boolean): void
}

/** Puerto de salida: medir el espacio que le queda al panel de video. */
export interface StagePort {
  /** Avisa del límite ahora y cada vez que cambia. Devuelve cómo dejar de observar. */
  observeLimit(player: HTMLElement, onLimit: (limit: number) => void): () => void
}

export interface StageTransition {
  /** `false` cuando ya se puede ocultar del todo. */
  mounted: boolean
  state: string
}

export interface AnimationPort {
  /** El panel se pliega y despliega animado. */
  useStageTransition(visible: boolean): StageTransition
}

/** Todo lo que el reproductor necesita del exterior. Los adaptadores lo implementan. */
export interface PlayerPorts {
  playback: PlaybackPort
  library: LibraryPort
  settings: SettingsPort
  view: ViewPort
  stage: StagePort
  animation: AnimationPort
}

export const PortsContext = createContext<PlayerPorts | null>(null)

export function usePorts(): PlayerPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('Player necesita un PortsContext.Provider')
  return ports
}

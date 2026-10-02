import { createContext, useContext } from 'react'
import type {
  ErrorCode,
  HistoryEntry,
  Segment,
  TranscribePhase,
  TranscriptStatus
} from '@shared/types'
import type { SpeakerNames } from '@shared/speakers'
import type { ScrollAlign } from '../domain/scrollGeometry'

/** Avance de la transcripción del archivo abierto. */
export interface LiveProgress {
  phase: TranscribePhase
  /** 0–100. */
  progress: number
  /** Segundos restantes estimados, o `null` mientras no hay ritmo suficiente para medir. */
  etaSec: number | null
  /** Grabación de Rebecca Listen en curso: no hay porcentaje (tarea 27). */
  live?: boolean
}

/** Puerto de salida: la transcripción abierta y lo que se puede hacer con ella. */
export interface TranscriptPort {
  useEntry(): HistoryEntry | null
  useSegments(): Segment[]
  useStatus(): TranscriptStatus
  useError(): ErrorCode | null
  /** Avance del trabajo en curso, solo si es el del archivo abierto. */
  useLiveProgress(): LiveProgress | null
  /** El archivo abierto es el que se está transcribiendo. */
  useIsTranscribing(): boolean
  useCanEdit(): boolean
  /** Lo mismo que `useCanEdit`, leído en el momento (dentro de un manejador de eventos). */
  canEditNow(): boolean
  getSegment(index: number): Segment | undefined
  editSegment(index: number, text: string): void
  copyAll(): Promise<void>
  /** Nombres que el usuario puso a los hablantes de la entrada abierta (tarea 35). */
  useSpeakerNames(): SpeakerNames | undefined
  /** Nombre mostrado de un hablante: el puesto o el de por defecto ("Persona 1"). */
  speakerName(speaker: string, names: SpeakerNames | undefined): string
  renameSpeaker(speaker: string, name: string): void
}

/** Puerto de salida: el reproductor, del que la lista solo lee la posición y al que pide saltos. */
export interface PlaybackPort {
  usePlaying(): boolean
  /** Índice del segmento que suena, o `null` sin video. Solo cambia al cruzar de segmento. */
  useActiveSegment(segments: readonly Segment[]): number | null
  seek(time: number): void
}

export interface SettingsPort {
  useJoinLines(): boolean
  useAutoScroll(): boolean
}

/** Puerto de salida: cómo está colocada la vista en la ventana. */
export interface LayoutPort {
  /** El video tapa la transcripción. */
  useCovered(): boolean
  /** Tapada por el video, pero abierta como ventanita flotante. */
  useFloating(): boolean
  closeFloatingWindow(): void
}

export interface NotifierPort {
  notify(message: string): void
}

/**
 * Desplazamiento de la lista desde fuera de ella (la búsqueda pide llevar la coincidencia
 * a la vista). La lista se registra al montarse.
 */
export interface ScrollBusPort {
  register(scroller: (index: number, align: ScrollAlign) => void): () => void
  scrollTo(index: number, align: ScrollAlign): void
}

/** Puerto de salida: qué índices de la lista acaban de llegar, para animarlos. */
export interface AnimationPort {
  useArrivals(count: number): (index: number) => boolean
}

export interface VirtualRow {
  index: number
  key: string | number | bigint
  start: number
}

/** Lo que la lista necesita de un virtualizador de filas. */
export interface RowVirtualizer {
  getVirtualItems(): VirtualRow[]
  getTotalSize(): number
  scrollToIndex(
    index: number,
    options?: { align?: ScrollAlign; behavior?: 'auto' | 'smooth' }
  ): void
  measureElement: (el: Element | null) => void
}

export interface VirtualizationOptions {
  count: number
  /** Con "Unir líneas" cada fila es un párrafo; sin él, un segmento. */
  joinLines: boolean
  scrollRef: React.RefObject<HTMLElement | null>
}

export interface VirtualizationPort {
  useRows(options: VirtualizationOptions): RowVirtualizer
}

/** Todo lo que la vista necesita del exterior. Los adaptadores lo implementan. */
export interface TranscriptViewPorts {
  transcript: TranscriptPort
  playback: PlaybackPort
  settings: SettingsPort
  layout: LayoutPort
  notifier: NotifierPort
  scroll: ScrollBusPort
  animation: AnimationPort
  virtualization: VirtualizationPort
}

export const PortsContext = createContext<TranscriptViewPorts | null>(null)

export function usePorts(): TranscriptViewPorts {
  const ports = useContext(PortsContext)
  if (!ports) throw new Error('TranscriptView necesita un PortsContext.Provider')
  return ports
}

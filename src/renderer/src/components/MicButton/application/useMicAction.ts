import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MicDevice, MonitorLevel, RecordingSource } from '@shared/recording'
import {
  elapsedLabel,
  micButtonState,
  selectedMicId,
  withSavedApp,
  usesMicrophone,
  usesOutput,
  type MicButtonState
} from '../domain/mic'
import { recordingName } from '@renderer/lib/recordingName'
import { usePorts } from './ports'
import { useWave } from './useWave'

const TICK_MS = 1000

export interface MicAction {
  button: MicButtonState
  /** Contador `m:ss` mientras graba; vacío si no. */
  elapsed: string
  /** Niveles recientes (0..1, el último a la derecha) mientras graba. */
  wave: number[]
  source: RecordingSource
  sourceLabel: (source: RecordingSource) => string
  chooseSource: (source: RecordingSource) => void
  /** La fuente elegida graba del micrófono (Mi voz o Ambos). */
  usesMicrophone: boolean
  /** Los conectados la última vez que se abrió el menú. */
  microphones: MicDevice[]
  /** El marcado en el menú; vacío = el predeterminado de Windows. */
  micId: string
  /** El guardado tal cual, para el medidor: si ya no está conectado, el main abre el predeterminado. */
  savedMicId: string
  chooseMic: (id: string) => void
  /** La fuente elegida graba el sonido de una salida (Computadora o Ambos). */
  usesOutput: boolean
  /** Las salidas de sonido activas la última vez que se abrió el menú. */
  outputs: MicDevice[]
  /** La marcada en el menú; vacía = la predeterminada de Windows. */
  outputId: string
  /** La guardada tal cual, para el medidor. */
  savedOutputId: string
  chooseOutput: (id: string) => void
  /** Los programas con sesión de audio la última vez que se abrió el menú. */
  apps: MicDevice[]
  /** El programa elegido (su .exe); vacío = todo lo que suena. */
  appExe: string
  chooseApp: (exe: string) => void
  /** Vuelve a pedir la lista (al abrir el menú, por si se conectó otro). */
  refreshDevices: () => void
  toggle: () => void
}

/** Hora actual que se refresca cada segundo mientras `active`. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    // Hasta el primer tic el contador marca 0:00 (`formatClock` no baja de cero).
    if (!active) return
    const timer = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(timer)
  }, [active])
  return now
}

export type MonitorLevels = Record<MonitorLevel['device'], number>
const SILENT_LEVELS: MonitorLevels = { system: 0, voice: 0 }

/**
 * Nivel en vivo de la salida `outputId` y del micrófono `micId` mientras el componente que lo usa
 * está montado (los medidores del menú): el main los abre solo para medir y los cierra al
 * desmontarse.
 */
export function useMicMonitor(
  source: RecordingSource,
  micId: string,
  outputId: string,
  appExe: string
): MonitorLevels {
  const { mic } = usePorts()
  const [levels, setLevels] = useState(SILENT_LEVELS)
  useEffect(() => {
    const off = mic.onMonitorLevel(({ device, level }) =>
      setLevels((current) => ({ ...current, [device]: level }))
    )
    mic.startMonitor(source, micId, outputId, appExe)
    return () => {
      off()
      mic.stopMonitor()
      setLevels(SILENT_LEVELS)
    }
  }, [mic, source, micId, outputId, appExe])
  return levels
}

/** Botón de grabar: empezar con la fuente elegida, parar, y el menú de fuentes y micrófonos. */
export function useMicAction(): MicAction {
  const { t } = useTranslation()
  const { mic } = usePorts()
  const button = micButtonState(mic.useState(), mic.useLiveSession(), mic.usePending())
  const source = mic.useSource()
  const savedMicId = mic.useMicId()
  const savedOutputId = mic.useOutputId()
  const [microphones, setMicrophones] = useState<MicDevice[]>([])
  const [outputs, setOutputs] = useState<MicDevice[]>([])
  const [running, setRunning] = useState<MicDevice[]>([])
  const appExe = mic.useAppExe()
  const now = useNow(button.kind === 'recording')
  const wave = useWave(button.kind === 'recording', mic.onLevel)
  const sourceLabel = (s: RecordingSource): string => t(`mic.sources.${s}`)

  return {
    button,
    elapsed: button.kind === 'recording' ? elapsedLabel(button.startedAt, now) : '',
    wave,
    source,
    sourceLabel,
    chooseSource: mic.setSource,
    usesMicrophone: usesMicrophone(source),
    microphones,
    micId: selectedMicId(savedMicId, microphones),
    savedMicId,
    chooseMic: mic.setMicId,
    usesOutput: usesOutput(source),
    outputs,
    outputId: selectedMicId(savedOutputId, outputs),
    savedOutputId,
    chooseOutput: mic.setOutputId,
    apps: withSavedApp(running, appExe),
    appExe,
    chooseApp: mic.setAppExe,
    refreshDevices: () => {
      void mic.listMicrophones().then(setMicrophones)
      void mic.listOutputs().then(setOutputs)
      void mic.listApps().then(setRunning)
    },
    toggle: () => {
      if (button.kind === 'recording') return mic.stop()
      mic.start(source, recordingName(source))
    }
  }
}

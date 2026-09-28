import { useEffect } from 'react'
import { create } from 'zustand'
import type { OpenedMedia } from '@shared/types'
import { mediaUrl } from '@shared/media'

/** Velocidades del reproductor (spec §4.1: de 0.5x a 2x). */
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const
export type PlaybackRate = (typeof PLAYBACK_RATES)[number]

/** Salto de `←/→` (spec §6). */
export const SKIP_SECONDS = 5

interface PlayerState {
  /** URL `media://` del archivo cargado, o `null` si no hay ninguno. */
  src: string | null
  /** `false` si el archivo es solo audio: se muestra el fondo neutro con el nombre. */
  hasVideo: boolean
  currentTime: number
  duration: number
  playing: boolean
  /** 0–1. */
  volume: number
  muted: boolean
  rate: PlaybackRate

  /** El único `<video>` de la app lo registra el Player al montarse. */
  attach: (element: HTMLVideoElement | null) => void
  load: (media: OpenedMedia | null, fallbackDuration?: number) => void
  play: () => void
  pause: () => void
  toggle: () => void
  seek: (t: number) => void
  /** Avanza o retrocede `delta` segundos desde la posición actual. */
  skip: (delta: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  setRate: (rate: PlaybackRate) => void
}

// El elemento vive fuera del estado: no es un dato que pinte nada y no debe disparar renders.
let element: HTMLVideoElement | null = null

function clampTime(t: number, duration: number): number {
  const max = duration > 0 ? duration : Number.POSITIVE_INFINITY
  return Math.min(Math.max(0, t), max)
}

/**
 * Estado del reproductor. El `<video>` es la fuente de verdad del tiempo y de play/pausa:
 * las acciones le dan órdenes y sus eventos (ver `bindVideoEvents`) actualizan el store.
 * Volumen, silencio y velocidad los fija el store y se aplican al elemento.
 */
export const usePlayerStore = create<PlayerState>()((set, get) => ({
  src: null,
  hasVideo: true,
  currentTime: 0,
  duration: 0,
  playing: false,
  volume: 0.8,
  muted: false,
  rate: 1,

  attach: (el) => {
    element = el
    if (!el) return
    const { volume, muted, rate } = get()
    el.volume = volume
    el.muted = muted
    el.playbackRate = rate
  },
  load: (media, fallbackDuration = 0) => {
    const info = media?.info
    set({
      src: media ? mediaUrl(media.id) : null,
      hasVideo: info ? info.videoCodec !== null : true,
      currentTime: 0,
      duration: info?.durationSec || fallbackDuration,
      playing: false
    })
  },
  play: () => {
    if (!element || !get().src) return
    // play() rechaza si otro load() lo interrumpe; no es un error que haya que mostrar.
    element.play().catch(() => {})
  },
  pause: () => element?.pause(),
  toggle: () => (get().playing ? get().pause() : get().play()),
  seek: (t) => {
    if (!element || !get().src) return
    const time = clampTime(t, get().duration)
    element.currentTime = time
    // Se refleja ya para que la barra y el resaltado no esperen al evento `seeked`.
    set({ currentTime: time })
  },
  skip: (delta) => get().seek(get().currentTime + delta),
  setVolume: (volume) => {
    const v = Math.min(1, Math.max(0, volume))
    set({ volume: v, muted: false })
    if (element) {
      element.volume = v
      element.muted = false
    }
  },
  toggleMute: () => {
    const muted = !get().muted
    set({ muted })
    if (element) element.muted = muted
  },
  setRate: (rate) => {
    set({ rate })
    if (element) element.playbackRate = rate
  }
}))

/**
 * Conecta los eventos del `<video>` con el store. Mientras suena, el tiempo se lee en cada
 * frame (no solo con `timeupdate`, que llega unas 4 veces por segundo) para que el
 * resaltado y los subtítulos cambien justo cuando empieza cada segmento.
 */
export function bindVideoEvents(el: HTMLVideoElement): () => void {
  const set = usePlayerStore.setState
  let frame = 0

  const tick = (): void => {
    set({ currentTime: el.currentTime })
    frame = requestAnimationFrame(tick)
  }
  const stopTicking = (): void => cancelAnimationFrame(frame)

  const onPlay = (): void => {
    set({ playing: true })
    stopTicking()
    frame = requestAnimationFrame(tick)
  }
  const onPause = (): void => {
    stopTicking()
    set({ playing: false, currentTime: el.currentTime })
  }
  const onTime = (): void => set({ currentTime: el.currentTime })
  const onDuration = (): void => {
    if (Number.isFinite(el.duration) && el.duration > 0) set({ duration: el.duration })
  }
  const onLoaded = (): void => {
    // Cargar otro archivo devuelve playbackRate a 1: se vuelve a aplicar la elegida.
    el.playbackRate = usePlayerStore.getState().rate
    onDuration()
  }
  // Por si el sistema cambia el volumen del elemento (p. ej. teclas multimedia).
  const onVolume = (): void => set({ volume: el.volume, muted: el.muted })

  const listeners: [string, () => void][] = [
    ['play', onPlay],
    ['pause', onPause],
    ['ended', onPause],
    ['emptied', onPause],
    ['timeupdate', onTime],
    ['seeked', onTime],
    ['loadedmetadata', onLoaded],
    ['durationchange', onDuration],
    ['volumechange', onVolume]
  ]
  for (const [type, fn] of listeners) el.addEventListener(type, fn)
  return () => {
    stopTicking()
    for (const [type, fn] of listeners) el.removeEventListener(type, fn)
  }
}

/**
 * Elementos que ya usan la tecla: escribir, marcar casillas, pulsar botones, mover sliders,
 * navegar menús. Los segmentos de la transcripción no están: con uno enfocado, `Enter` salta
 * a él y `Espacio` sigue siendo play/pausa.
 */
const KEY_OWNERS = 'input, textarea, select, button, a[href], [contenteditable], [role="menu"]'

/**
 * Atajos del reproductor (spec §6): `Espacio` play/pausa y `←/→` ±5 s. No actúan si el foco
 * está en un control que ya usa la tecla ni con un diálogo modal abierto. Se llama en la
 * vista principal, así que en Configuración no responden.
 */
export function usePlayerShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey) return
      if (document.querySelector('dialog[open]')) return
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest(KEY_OWNERS)) return

      const { src, toggle, skip } = usePlayerStore.getState()
      if (!src) return
      if (e.code === 'Space') {
        if (!e.repeat) toggle()
      } else if (e.key === 'ArrowLeft') {
        skip(-SKIP_SECONDS)
      } else if (e.key === 'ArrowRight') {
        skip(SKIP_SECONDS)
      } else {
        return
      }
      // Sin esto, Espacio y las flechas también desplazan la transcripción.
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

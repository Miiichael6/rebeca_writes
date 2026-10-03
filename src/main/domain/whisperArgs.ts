import type { TranscribeOptions } from '@shared/types'

/**
 * Entropía por debajo de la cual un resultado se da por fallido y se reintenta con más
 * temperatura. Más exigente que la de whisper (2.40): descarta antes el texto repetitivo. El
 * umbral de probabilidad (`-lpt`) se deja en el de whisper: bajarlo reintenta menos.
 */
const ENTROPY_THRESHOLD = 2.6

/**
 * Con el filtro de voz, ningún tramo pasa de estos segundos: whisper transcribe trozos cortos y
 * un bucle de repetición no tiene dónde crecer.
 */
const VAD_MAX_SPEECH_SEC = 15

/** Argumentos de `whisper-cli` para un WAV: `-pp` imprime el progreso y los segmentos salen por stdout. */
export function whisperArgs(opts: {
  model: string
  wav: string
  language: string
  translate?: boolean
  options?: TranscribeOptions
  /** Modelo Silero: si se pasa, whisper solo transcribe los tramos con voz (`--vad`). */
  vadModel?: string
}): string[] {
  const o = opts.options ?? {}
  return [
    '-m', opts.model, '-f', opts.wav, '-l', opts.language, '-pp',
    // Sin texto previo como contexto: evita los bucles de repetición ("no no no no…").
    '-mc', '0',
    '-et', String(ENTROPY_THRESHOLD),
    ...(opts.vadModel
      ? ['--vad', '-vm', opts.vadModel, '-vmsd', String(VAD_MAX_SPEECH_SEC)]
      : []),
    ...(o.prompt ? ['--prompt', o.prompt] : []),
    ...(o.maxLen ? ['-ml', String(o.maxLen)] : []),
    ...(o.suppressNst ? ['--suppress-nst'] : []),
    ...(opts.translate ? ['-tr'] : []),
    ...(o.threads ? ['-t', String(o.threads)] : [])
  ] // prettier-ignore
}

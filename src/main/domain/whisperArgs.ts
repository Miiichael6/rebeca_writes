import type { TranscribeOptions } from '@shared/types'

/** Argumentos de `whisper-cli` para un WAV: `-pp` imprime el progreso y los segmentos salen por stdout. */
export function whisperArgs(opts: {
  model: string
  wav: string
  language: string
  translate?: boolean
  options?: TranscribeOptions
}): string[] {
  const o = opts.options ?? {}
  return [
    '-m', opts.model, '-f', opts.wav, '-l', opts.language, '-pp',
    ...(o.prompt ? ['--prompt', o.prompt] : []),
    ...(o.maxLen ? ['-ml', String(o.maxLen)] : []),
    ...(o.suppressNst ? ['--suppress-nst'] : []),
    ...(opts.translate ? ['-tr'] : []),
    ...(o.threads ? ['-t', String(o.threads)] : [])
  ] // prettier-ignore
}

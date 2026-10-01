/**
 * Puerto de salida: un ffmpeg que genera una vista previa en segundo plano. Resuelve cuando
 * el proceso terminó y soltó `out`; rechaza si falla o si `signal` se aborta (lo mata).
 */
export interface PreviewEncoder {
  run(
    args: string[],
    durationSec: number,
    onProgress: (percent: number) => void,
    signal: AbortSignal
  ): Promise<void>
}

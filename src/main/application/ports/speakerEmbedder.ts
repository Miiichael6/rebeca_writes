/** Puerto de salida: huellas de voz para saber quién habla (tarea 35). */
export interface SpeakerEmbedder {
  /**
   * Huella del tramo `[start, end]` (segundos) de un WAV mono de 16 kHz, o `null` si no se pudo
   * (el modelo aún no está, el tramo no sirve o el extractor falló). Nunca rechaza.
   */
  embed(wav: string, start: number, end: number): Promise<number[] | null>
  /** Libera el extractor y su modelo de la memoria; el próximo `embed` lo vuelve a cargar. */
  release(): void
}

/**
 * Tiempo restante de una transcripción a partir del ritmo reciente: compara el progreso
 * actual con el de hace unos puntos (`windowPercent`), no con el del inicio, así se adapta
 * si whisper acelera o se frena (p. ej. tramos de silencio o de mucho texto).
 */
export class EtaEstimator {
  private samples: { at: number; percent: number }[] = []

  constructor(
    /** Cuántos puntos de progreso hacia atrás se miran para medir el ritmo. */
    private readonly windowPercent = 10,
    /** Por debajo de este intervalo la medida es ruido: no se estima. */
    private readonly minSpanMs = 3000
  ) {}

  /** Registra el progreso (0–100) en el instante `at` (ms) y devuelve los segundos restantes, o `null` si aún no se puede estimar. */
  push(percent: number, at: number): number | null {
    const last = this.samples.at(-1)
    // Un retroceso (p. ej. otro backend reintentando desde cero) invalida lo medido.
    if (last && percent < last.percent) this.samples = []
    this.samples.push({ at, percent })

    // Se descartan las muestras viejas, pero se conserva la última fuera de la ventana
    // para que el tramo medido cubra toda la ventana.
    while (this.samples.length > 2 && this.samples[1].percent <= percent - this.windowPercent) {
      this.samples.shift()
    }

    const first = this.samples[0]
    const span = at - first.at
    const advanced = percent - first.percent
    if (span < this.minSpanMs || advanced <= 0) return null
    const msPerPercent = span / advanced
    return Math.max(0, ((100 - percent) * msPerPercent) / 1000)
  }

  reset(): void {
    this.samples = []
  }
}

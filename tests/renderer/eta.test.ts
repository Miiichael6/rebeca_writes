import { describe, expect, it } from 'vitest'
import { EtaEstimator } from '../../src/renderer/src/lib/eta'

describe('EtaEstimator', () => {
  it('no estima hasta tener un intervalo suficiente', () => {
    const eta = new EtaEstimator(10, 3000)
    expect(eta.push(5, 0)).toBeNull()
    expect(eta.push(6, 1000)).toBeNull()
  })

  it('a ritmo constante calcula lo que falta', () => {
    const eta = new EtaEstimator(10, 3000)
    // 1 % por segundo.
    let result: number | null = null
    for (let p = 5; p <= 40; p++) result = eta.push(p, (p - 5) * 1000)
    expect(result).toBeCloseTo(60)
  })

  it('usa el ritmo reciente, no el del inicio', () => {
    const eta = new EtaEstimator(10, 3000)
    // Primero 1 % cada 5 s, luego 1 % por segundo.
    let at = 0
    for (let p = 5; p <= 20; p++) eta.push(p, (at += 5000))
    let result: number | null = null
    for (let p = 21; p <= 50; p++) result = eta.push(p, (at += 1000))
    expect(result).toBeCloseTo(50)
  })

  it('un retroceso reinicia la medida', () => {
    const eta = new EtaEstimator(10, 3000)
    for (let p = 5; p <= 30; p++) eta.push(p, p * 1000)
    expect(eta.push(5, 40_000)).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { followDetected, isCudaDownloadable, needsDetection } from '../../src/main/engine/detection'

describe('needsDetection', () => {
  it('detecta en el primer arranque', () => {
    expect(needsDetection({ detectedBackend: null, installedBackends: [] }, ['cpu'])).toBe(true)
  })

  it('no repite si nada cambió', () => {
    const saved = { detectedBackend: 'cpu' as const, installedBackends: ['cuda', 'cpu'] as const }
    expect(needsDetection(saved, ['cuda', 'cpu'])).toBe(false)
  })

  it('repite si el detectado ya no está instalado (se quitó CUDA)', () => {
    const saved = { detectedBackend: 'cuda' as const, installedBackends: ['cuda', 'cpu'] as const }
    expect(needsDetection(saved, ['cpu'])).toBe(true)
  })

  it('repite si aparece un backend mejor (el bug de la 23: se quedaba en cpu)', () => {
    const saved = { detectedBackend: 'cpu' as const, installedBackends: ['cpu'] as const }
    expect(needsDetection(saved, ['cuda', 'cpu'])).toBe(true)
  })

  it('settings de antes de la 23.1 (sin la lista) vuelven a detectar una vez', () => {
    expect(needsDetection({ detectedBackend: 'cpu', installedBackends: [] }, ['cuda', 'cpu'])).toBe(
      true
    )
  })
})

describe('followDetected', () => {
  it('sin elegido usa el detectado', () => {
    expect(followDetected(null, null, 'cuda')).toBe('cuda')
  })

  it('si el elegido era el detectado anterior, sigue al nuevo', () => {
    expect(followDetected('cpu', 'cpu', 'cuda')).toBe('cuda')
    expect(followDetected('cuda', 'cuda', 'cpu')).toBe('cpu')
  })

  it('respeta un backend elegido a mano distinto del detectado', () => {
    expect(followDetected('cpu', 'vulkan', 'cuda')).toBe('cpu')
  })
})

describe('isCudaDownloadable', () => {
  it('solo con NVIDIA y sin CUDA instalado', () => {
    expect(isCudaDownloadable(true, ['cpu'])).toBe(true)
    expect(isCudaDownloadable(true, ['cuda', 'cpu'])).toBe(false)
    expect(isCudaDownloadable(false, ['cpu'])).toBe(false)
    expect(isCudaDownloadable(false, ['vulkan', 'cpu'])).toBe(false)
  })
})

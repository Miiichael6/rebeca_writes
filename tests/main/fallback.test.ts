import { describe, expect, it, vi } from 'vitest'
import type { Backend } from '@shared/types'
import {
  BackendLoadError,
  BackendNotInstalledError,
  detectLoadFailure,
  fallbackChain,
  probeFoundDevice,
  withBackendFallback,
  type LoadAttempt
} from '../../src/main/domain/fallback'

// Fragmentos reales de whisper-cli b5130 (build cublas-12.4) en una RTX 3050.
const CUDA_OK = `ggml_cuda_init: found 1 CUDA devices (Total VRAM: 6143 MiB):
load_backend: loaded CUDA backend from C:\\app\\resources\\bin\\cuda\\ggml-cuda.dll
load_backend: loaded CPU backend from C:\\app\\resources\\bin\\cuda\\ggml-cpu-haswell.dll
whisper_backend_init_gpu: using CUDA0 backend`

// Mismo exe con CUDA_VISIBLE_DEVICES=-1: carga la DLL pero no ve la GPU y sigue en CPU.
const CUDA_NO_DEVICE = `ggml_cuda_init: failed to initialize CUDA: no CUDA-capable device is detected
load_backend: loaded CUDA backend from C:\\app\\resources\\bin\\cuda\\ggml-cuda.dll
load_backend: loaded CPU backend from C:\\app\\resources\\bin\\cuda\\ggml-cpu-haswell.dll
whisper_backend_init_gpu: device 0: CPU (type: 0)
whisper_backend_init_gpu: no GPU found`

const attempt = (over: Partial<LoadAttempt>): LoadAttempt => ({
  backend: 'cuda',
  stderr: '',
  exitCode: null,
  elapsedMs: 500,
  producedSegments: false,
  ...over
})

describe('detectLoadFailure', () => {
  it('no marca fallo si CUDA carga bien', () => {
    expect(detectLoadFailure(attempt({ stderr: CUDA_OK }))).toBeNull()
    expect(detectLoadFailure(attempt({ stderr: CUDA_OK, exitCode: 0 }))).toBeNull()
  })

  it('detecta GPU no disponible aunque el proceso siga vivo', () => {
    expect(detectLoadFailure(attempt({ stderr: CUDA_NO_DEVICE }))).toBe('no-device')
    expect(
      detectLoadFailure(attempt({ backend: 'vulkan', stderr: 'Found 0 Vulkan devices' }))
    ).toBe('no-device')
  })

  it('"no GPU found" es lo normal en el backend CPU', () => {
    expect(detectLoadFailure(attempt({ backend: 'cpu', stderr: CUDA_NO_DEVICE }))).toBeNull()
  })

  it('detecta DLL faltante por el NTSTATUS, con o sin signo', () => {
    expect(detectLoadFailure(attempt({ exitCode: 3221225781 }))).toBe('missing-dll')
    expect(detectLoadFailure(attempt({ exitCode: -1073741515 }))).toBe('missing-dll')
  })

  it('detecta falta de VRAM', () => {
    const stderr = `${CUDA_OK}\nggml_backend_cuda_buffer_type_alloc_buffer: allocating 3000 MiB on device 0: cudaMalloc failed: out of memory`
    expect(detectLoadFailure(attempt({ stderr }))).toBe('out-of-memory')
    expect(
      detectLoadFailure(
        attempt({ backend: 'vulkan', stderr: 'vk::Device::allocateMemory: ErrorOutOfDeviceMemory' })
      )
    ).toBe('out-of-memory')
  })

  it('un exit != 0 temprano es fallo de carga; uno tardío no', () => {
    expect(detectLoadFailure(attempt({ exitCode: 1, elapsedMs: 2_000 }))).toBe('crashed')
    expect(detectLoadFailure(attempt({ exitCode: 1, elapsedMs: 60_000 }))).toBeNull()
  })

  it('los errores del modelo o del audio no son del backend', () => {
    const stderr = `${CUDA_OK}\nwhisper_init_from_file_with_params_no_state: failed to open 'x.bin'\nerror: failed to initialize whisper context`
    expect(detectLoadFailure(attempt({ stderr, exitCode: 3 }))).toBeNull()
  })

  it('una vez que salen segmentos no hay fallback', () => {
    expect(
      detectLoadFailure(attempt({ stderr: CUDA_NO_DEVICE, producedSegments: true }))
    ).toBeNull()
  })
})

describe('probeFoundDevice', () => {
  it('CUDA necesita al menos un dispositivo', () => {
    expect(probeFoundDevice('cuda', CUDA_OK)).toBe(true)
    expect(probeFoundDevice('cuda', CUDA_NO_DEVICE)).toBe(false)
    expect(probeFoundDevice('cuda', '')).toBe(false)
  })

  it('Vulkan necesita la DLL cargada y un dispositivo', () => {
    const ok = 'ggml_vulkan: Found 1 Vulkan devices:\nload_backend: loaded Vulkan backend from x'
    expect(probeFoundDevice('vulkan', ok)).toBe(true)
    expect(probeFoundDevice('vulkan', 'ggml_vulkan: Found 0 Vulkan devices:')).toBe(false)
  })

  it('CPU solo necesita cargar', () => {
    expect(probeFoundDevice('cpu', 'load_backend: loaded CPU backend from x')).toBe(true)
  })
})

describe('fallbackChain', () => {
  it('baja en orden CUDA → Vulkan → CPU saltando lo no instalado', () => {
    expect(fallbackChain('cuda', ['cuda', 'vulkan', 'cpu'])).toEqual(['cuda', 'vulkan', 'cpu'])
    expect(fallbackChain('cuda', ['cpu', 'cuda'])).toEqual(['cuda', 'cpu'])
    expect(fallbackChain('vulkan', ['cuda', 'vulkan', 'cpu'])).toEqual(['vulkan', 'cpu'])
    expect(fallbackChain('cpu', ['cuda'])).toEqual([])
  })
})

describe('withBackendFallback', () => {
  it('usa el primer backend si funciona', async () => {
    const onFallback = vi.fn()
    const r = await withBackendFallback('cuda', ['cuda', 'cpu'], async (b) => b, onFallback)
    expect(r).toEqual({ result: 'cuda', backend: 'cuda' })
    expect(onFallback).not.toHaveBeenCalled()
  })

  it('reintenta con el siguiente y avisa', async () => {
    const onFallback = vi.fn()
    const tried: Backend[] = []
    const r = await withBackendFallback(
      'cuda',
      ['cuda', 'vulkan', 'cpu'],
      async (b) => {
        tried.push(b)
        if (b !== 'cpu') throw new BackendLoadError(b, 'no-device')
        return 'ok'
      },
      onFallback
    )
    expect(r).toEqual({ result: 'ok', backend: 'cpu' })
    expect(tried).toEqual(['cuda', 'vulkan', 'cpu'])
    expect(onFallback.mock.calls.map(([e]) => e)).toEqual([
      { from: 'cuda', to: 'vulkan', reason: 'no-device' },
      { from: 'vulkan', to: 'cpu', reason: 'no-device' }
    ])
  })

  it('avisa si el backend elegido no está instalado', async () => {
    const onFallback = vi.fn()
    const r = await withBackendFallback('cuda', ['cpu'], async (b) => b, onFallback)
    expect(r.backend).toBe('cpu')
    expect(onFallback).toHaveBeenCalledWith({ from: 'cuda', to: 'cpu', reason: 'not-installed' })
  })

  it('no reintenta otros errores ni el último backend', async () => {
    await expect(
      withBackendFallback('cuda', ['cuda', 'cpu'], async () => {
        throw new Error('modelo corrupto')
      })
    ).rejects.toThrow('modelo corrupto')

    await expect(
      withBackendFallback('cpu', ['cpu'], async () => {
        throw new BackendLoadError('cpu', 'crashed')
      })
    ).rejects.toBeInstanceOf(BackendLoadError)
  })

  it('falla si no hay ningún backend instalado', async () => {
    await expect(withBackendFallback('cuda', [], async () => 1)).rejects.toBeInstanceOf(
      BackendNotInstalledError
    )
  })
})

import { describe, expect, it } from 'vitest'
import type { BackendInfo, CudaPackageStatus } from '@shared/types'
import {
  activeBackend,
  backendOptionState,
  cudaCard
} from '@renderer/components/settings/BackendSetting/domain/backend'

const info = (extra: Partial<BackendInfo> = {}): BackendInfo => ({
  backend: 'cpu',
  detected: 'vulkan',
  installed: ['vulkan', 'cpu'],
  nvidia: false,
  cudaDownloadable: false,
  ...extra
})

const cuda = (extra: Partial<CudaPackageStatus> = {}): CudaPackageStatus => ({
  state: 'missing',
  partBytes: 0,
  sizeBytes: 1000,
  removable: false,
  ...extra
})

describe('activeBackend', () => {
  it('usa el elegido si está instalado y, si no, el detectado', () => {
    expect(activeBackend('cpu', info())).toBe('cpu')
    expect(activeBackend('cuda', info())).toBe('vulkan')
    expect(activeBackend(null, info())).toBe('vulkan')
  })
  it('sin información devuelve lo elegido', () => {
    expect(activeBackend('cpu', null)).toBe('cpu')
    expect(activeBackend(null, null)).toBeNull()
  })
})

describe('backendOptionState', () => {
  it('marca instalado, detectado y descargable', () => {
    expect(backendOptionState('vulkan', info())).toEqual({
      installed: true,
      detected: true,
      downloadable: false
    })
    expect(backendOptionState('cuda', info({ cudaDownloadable: true }))).toEqual({
      installed: false,
      detected: false,
      downloadable: true
    })
  })
  it('sin información todos cuentan como instalados', () => {
    expect(backendOptionState('cuda', null).installed).toBe(true)
  })
})

describe('cudaCard', () => {
  it('se oculta sin información, sin NVIDIA o sin nada que quitar', () => {
    expect(cudaCard(null, cuda())).toBeNull()
    expect(cudaCard(info(), null)).toBeNull()
    expect(cudaCard(info(), cuda())).toBeNull()
  })
  it('ofrece descargar cuando hay NVIDIA sin CUDA', () => {
    expect(cudaCard(info({ cudaDownloadable: true }), cuda())).toMatchObject({
      description: { kind: 'available', size: 1000 },
      showDownload: true,
      resume: false,
      showDelete: false
    })
  })
  it('ofrece reanudar y eliminar con una descarga a medias', () => {
    expect(cudaCard(info({ cudaDownloadable: true }), cuda({ partBytes: 400 }))).toMatchObject({
      description: { kind: 'partial', received: 400, total: 1000 },
      resume: true,
      showDelete: true
    })
  })
  it('descargando: cancelar y progreso', () => {
    expect(cudaCard(info(), cuda({ state: 'downloading' }))).toMatchObject({
      downloading: true,
      showCancel: true,
      showDownload: false
    })
  })
  it('instalado y quitable: listo y eliminar', () => {
    expect(cudaCard(info(), cuda({ state: 'installed', removable: true }))).toMatchObject({
      description: { kind: 'ready' },
      showDelete: true,
      showDownload: false
    })
  })
  it('instalando: se muestra sin acciones', () => {
    expect(cudaCard(info(), cuda({ state: 'installing' }))).toMatchObject({
      description: { kind: 'installing' },
      showCancel: false,
      showDownload: false
    })
  })
})

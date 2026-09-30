import { describe, expect, it } from 'vitest'
import type { ModelStatus } from '@shared/models'
import {
  defaultCustomName,
  isPartial,
  memoryLevel,
  rowActions,
  sizeInfo
} from '@renderer/components/settings/ModelsSection/domain/model'

const model = (extra: Partial<ModelStatus>): ModelStatus =>
  ({
    id: 'base',
    label: 'Base',
    state: 'missing',
    sizeOnDisk: 0,
    sizeBytes: 100,
    ...extra
  }) as ModelStatus

describe('memoryLevel', () => {
  it('clasifica por GB', () => {
    expect(memoryLevel(1)).toBe('low')
    expect(memoryLevel(2)).toBe('medium')
    expect(memoryLevel(3.9)).toBe('high')
  })
})

describe('sizeInfo', () => {
  it('descargado: lo que ocupa en disco', () => {
    expect(sizeInfo(model({ state: 'downloaded', sizeOnDisk: 90 }))).toEqual({
      kind: 'size',
      bytes: 90
    })
  })
  it('a medias: recibido y total', () => {
    expect(sizeInfo(model({ sizeOnDisk: 30 }))).toEqual({
      kind: 'partial',
      received: 30,
      total: 100
    })
  })
  it('sin descargar: el tamaño del catálogo', () => {
    expect(sizeInfo(model({}))).toEqual({ kind: 'size', bytes: 100 })
  })
  it('propio: su tamaño o archivo perdido', () => {
    expect(sizeInfo(model({ custom: true, state: 'downloaded', sizeOnDisk: 5 }))).toEqual({
      kind: 'size',
      bytes: 5
    })
    expect(sizeInfo(model({ custom: true, state: 'missing' }))).toEqual({ kind: 'fileMissing' })
  })
})

describe('rowActions', () => {
  it('sin descargar: solo descargar', () => {
    expect(rowActions(model({}))).toEqual({
      cancel: false,
      download: true,
      resume: false,
      remove: false
    })
  })
  it('a medias: reanudar y eliminar', () => {
    const m = model({ sizeOnDisk: 10 })
    expect(isPartial(m)).toBe(true)
    expect(rowActions(m)).toMatchObject({ download: true, resume: true, remove: true })
  })
  it('descargando: solo cancelar', () => {
    expect(rowActions(model({ state: 'downloading' }))).toMatchObject({
      cancel: true,
      download: false,
      remove: false
    })
  })
  it('propio: quitar, nunca descargar', () => {
    expect(rowActions(model({ custom: true }))).toMatchObject({ download: false, remove: true })
  })
})

describe('defaultCustomName', () => {
  it('quita carpeta y .bin', () => {
    expect(defaultCustomName('C:\\m\\ggml-mio.BIN')).toBe('ggml-mio')
    expect(defaultCustomName('/a/b/x.bin')).toBe('x')
  })
})

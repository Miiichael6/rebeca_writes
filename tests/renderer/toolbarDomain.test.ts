import { describe, expect, it } from 'vitest'
import {
  actionButton,
  fallbackModel,
  hasModel,
  isLocked,
  modelOptions,
  MORE_MODELS,
  needsRestartConfirm
} from '@renderer/components/Toolbar/domain/toolbar'

const downloaded = [
  { id: 'small', label: 'Small' },
  { id: 'base', label: 'Base' }
]

describe('fallbackModel', () => {
  it('no cambia nada si la lista no cargó, está vacía o el modelo sirve', () => {
    expect(fallbackModel(false, downloaded, 'x')).toBeNull()
    expect(fallbackModel(true, [], 'x')).toBeNull()
    expect(fallbackModel(true, downloaded, 'base')).toBeNull()
  })
  it('pasa al primer descargado si el elegido ya no está', () => {
    expect(fallbackModel(true, downloaded, 'large')).toBe('small')
  })
})

describe('modelOptions', () => {
  const labels = { noModels: 'Sin modelos', moreModels: 'Más' }
  it('termina con «más modelos»', () => {
    const opts = modelOptions(downloaded, true, labels)
    expect(opts.map((o) => o.value)).toEqual(['small', 'base', MORE_MODELS])
  })
  it('avisa de que falta el modelo con una opción vacía al principio', () => {
    expect(modelOptions([], false, labels)[0]).toEqual({ value: '', label: 'Sin modelos' })
    expect(hasModel(downloaded, 'base')).toBe(true)
    expect(hasModel(downloaded, 'x')).toBe(false)
  })
})

describe('botón principal', () => {
  it('cancelar mientras se transcribe, y bloquea los combos', () => {
    expect(actionButton('transcribing', null, true)).toEqual({ kind: 'cancel' })
    expect(isLocked('transcribing')).toBe(true)
    expect(isLocked('ready')).toBe(false)
  })
  it('transcribir o volver a transcribir según el estado', () => {
    expect(actionButton('ready', null, true)).toEqual({
      kind: 'transcribe',
      disabled: false,
      retranscribe: false
    })
    expect(actionButton('done', null, true)).toMatchObject({ retranscribe: true })
    expect(actionButton('error', null, true)).toMatchObject({ retranscribe: false })
  })
  it('se deshabilita sin modelo o con bloqueo', () => {
    expect(actionButton('ready', 'busy', true)).toMatchObject({ disabled: true })
    expect(actionButton('ready', null, false)).toMatchObject({ disabled: true })
  })
  it('sin botón cuando no hay nada abierto', () => {
    expect(actionButton('idle', 'noMedia', true)).toBeNull()
  })
})

describe('needsRestartConfirm', () => {
  it('pide confirmación solo si hay segmentos editados', () => {
    expect(needsRestartConfirm([{}, { edited: true }])).toBe(true)
    expect(needsRestartConfirm([{}, { edited: false }])).toBe(false)
    expect(needsRestartConfirm([])).toBe(false)
  })
})

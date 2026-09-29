import { describe, expect, it } from 'vitest'
import {
  AUTO_CHECK_INTERVAL_MS,
  installBlocker,
  shouldAutoCheck,
  updateErrorCode
} from '../../src/main/services/updatePolicy'

const base = { packaged: true, autoCheck: true, lastCheckAt: null, now: 1_000_000_000 }

describe('shouldAutoCheck', () => {
  it('comprueba en la app empaquetada la primera vez (sin lastCheckAt)', () => {
    expect(shouldAutoCheck(base)).toBe(true)
  })
  it('no comprueba en desarrollo', () => {
    expect(shouldAutoCheck({ ...base, packaged: false })).toBe(false)
  })
  it('no comprueba con el ajuste desactivado', () => {
    expect(shouldAutoCheck({ ...base, autoCheck: false })).toBe(false)
  })
  it('espera 6 h entre comprobaciones', () => {
    const lastCheckAt = base.now - AUTO_CHECK_INTERVAL_MS + 1
    expect(shouldAutoCheck({ ...base, lastCheckAt })).toBe(false)
  })
  it('con exactamente 6 h ya comprueba', () => {
    const lastCheckAt = base.now - AUTO_CHECK_INTERVAL_MS
    expect(shouldAutoCheck({ ...base, lastCheckAt })).toBe(true)
  })
})

describe('installBlocker', () => {
  it('sin nada en curso no bloquea', () => {
    expect(installBlocker({ transcribing: false, cudaJob: false })).toBeNull()
  })
  it('bloquea con una transcripción', () => {
    expect(installBlocker({ transcribing: true, cudaJob: false })).toBe('transcribing')
  })
  it('bloquea con la descarga de CUDA', () => {
    expect(installBlocker({ transcribing: false, cudaJob: true })).toBe('cudaDownload')
  })
  it('la transcripción tiene prioridad', () => {
    expect(installBlocker({ transcribing: true, cudaJob: true })).toBe('transcribing')
  })
})

describe('updateErrorCode', () => {
  it.each([
    [{ code: 'ENOTFOUND' }],
    [{ code: 'ECONNREFUSED' }],
    [new Error('net::ERR_INTERNET_DISCONNECTED')]
  ])('sin red → offline (%#)', (err) => {
    expect(updateErrorCode(err, 'check')).toBe('offline')
  })
  it('ENOSPC → noDiskSpace', () => {
    expect(updateErrorCode({ code: 'ENOSPC' }, 'download')).toBe('noDiskSpace')
  })
  it('lo demás depende de la fase', () => {
    expect(updateErrorCode(new Error('boom'), 'check')).toBe('checkFailed')
    expect(updateErrorCode(new Error('boom'), 'download')).toBe('downloadFailed')
    expect(updateErrorCode(undefined, 'check')).toBe('checkFailed')
  })
})

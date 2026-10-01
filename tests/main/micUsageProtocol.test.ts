import { describe, expect, it } from 'vitest'
import { parseMicUsageEvent } from '../../src/main/domain/meeting/micUsageProtocol'

describe('parseMicUsageEvent', () => {
  it('lee la lista de apps con el micrófono', () => {
    expect(parseMicUsageEvent('{"type":"mic_users","apps":["MSTeams_8wekyb3d8bbwe"]}')).toEqual({
      type: 'micUsers',
      apps: ['MSTeams_8wekyb3d8bbwe']
    })
  })

  it('lee los errores', () => {
    expect(
      parseMicUsageEvent('{"type":"error","code":"watch_failed","message":"no se pudo"}')
    ).toEqual({ type: 'error', code: 'watch_failed', message: 'no se pudo' })
  })

  it('descarta líneas que no son eventos conocidos', () => {
    expect(parseMicUsageEvent('hola')).toBeNull()
    expect(parseMicUsageEvent('{"type":"mic_users"}')).toBeNull()
    expect(parseMicUsageEvent('{"type":"otro"}')).toBeNull()
  })
})

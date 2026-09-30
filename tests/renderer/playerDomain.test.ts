import { describe, expect, it } from 'vitest'
import type { Segment } from '@shared/types'
import { VIDEO_HEIGHT_MIN } from '@shared/settings'
import { captionAt, seekKeyDirection } from '@renderer/components/Player/domain/captions'
import {
  clampVideoHeight,
  isCovered,
  isMaximized,
  maximizeTarget,
  resizeKeyDelta,
  stageLimit
} from '@renderer/components/Player/domain/stage'

const seg = (start: number, end: number, text: string): Segment => ({ start, end, text }) as Segment

describe('captionAt', () => {
  const segments = [seg(0, 2, 'uno'), seg(5, 7, 'dos')]
  it('devuelve el texto mientras dura el segmento', () => {
    expect(captionAt(segments, 1)).toBe('uno')
    expect(captionAt(segments, 6)).toBe('dos')
  })
  it('no muestra nada en los silencios', () => {
    expect(captionAt(segments, 3)).toBeNull()
    expect(captionAt([], 1)).toBeNull()
  })
})

describe('seekKeyDirection', () => {
  it('solo responde a las flechas horizontales', () => {
    expect(seekKeyDirection('ArrowLeft')).toBe(-1)
    expect(seekKeyDirection('ArrowRight')).toBe(1)
    expect(seekKeyDirection('ArrowUp')).toBe(0)
  })
})

describe('alto del panel', () => {
  it('stageLimit descuenta lo que ocupan los demás y el margen', () => {
    expect(stageLimit({ mainHeight: 800, othersHeight: 100, controlsHeight: 60 })).toBe(628)
  })

  it('clampVideoHeight respeta el mínimo y el límite, incluso si el límite es menor que el mínimo', () => {
    expect(clampVideoHeight(1000, 500)).toBe(500)
    expect(clampVideoHeight(10, 500)).toBe(VIDEO_HEIGHT_MIN)
    expect(clampVideoHeight(300.4, 10)).toBe(VIDEO_HEIGHT_MIN)
  })

  it('isMaximized tiene 1 px de tolerancia', () => {
    expect(isMaximized(499, 500)).toBe(true)
    expect(isMaximized(498, 500)).toBe(false)
  })

  it('isCovered exige medio, video, panel visible y poco espacio libre', () => {
    const base = { hasMedia: true, hasVideo: true, videoVisible: true, height: 400, limit: 500 }
    expect(isCovered(base)).toBe(true)
    expect(isCovered({ ...base, height: 300 })).toBe(false)
    expect(isCovered({ ...base, hasVideo: false })).toBe(false)
    expect(isCovered({ ...base, videoVisible: false })).toBe(false)
    expect(isCovered({ ...base, hasMedia: false })).toBe(false)
  })

  it('maximizeTarget maximiza recordando el alto y luego lo restaura', () => {
    const up = maximizeTarget({ maximized: false, height: 300, restore: 200, limit: 500 })
    expect(up).toEqual({ height: 500, restore: 300 })
    const down = maximizeTarget({ maximized: true, height: 500, restore: up.restore, limit: 500 })
    expect(down.height).toBe(300)
    expect(maximizeTarget({ maximized: true, height: 500, restore: 900, limit: 500 }).height).toBe(
      499
    )
  })

  it('resizeKeyDelta: ↓ agranda, ↑ achica', () => {
    expect(resizeKeyDelta('ArrowDown')).toBe(20)
    expect(resizeKeyDelta('ArrowUp')).toBe(-20)
    expect(resizeKeyDelta('a')).toBe(0)
  })
})

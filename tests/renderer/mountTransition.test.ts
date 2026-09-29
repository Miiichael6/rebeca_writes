import { describe, expect, it } from 'vitest'
import {
  CLOSED,
  initialPhase,
  OPENED,
  phaseChange,
  type MountPhase
} from '@renderer/lib/mountTransition'

/** Aplica un cambio de `open` como haría el hook: estado inmediato y, si lo hay, el final. */
function run(current: MountPhase, open: boolean, animate = true): MountPhase[] {
  const { next, settle } = phaseChange(current, open, animate)
  return settle ? [next, settle] : [next]
}

describe('mountTransition', () => {
  it('lo que ya está abierto no anima su entrada', () => {
    expect(initialPhase(true)).toEqual(OPENED)
    expect(initialPhase(false)).toEqual(CLOSED)
  })

  it('al abrir, monta entrando y acaba entrado', () => {
    expect(run(CLOSED, true)).toEqual([{ mounted: true, state: 'entering' }, OPENED])
  })

  it('al cerrar, sigue montado saliendo y se desmonta al acabar', () => {
    expect(run(OPENED, false)).toEqual([{ mounted: true, state: 'exiting' }, CLOSED])
  })

  it('reabrir durante la salida vuelve a entrar sin desmontar', () => {
    const exiting: MountPhase = { mounted: true, state: 'exiting' }
    expect(run(exiting, true)).toEqual([{ mounted: true, state: 'entering' }, OPENED])
  })

  it('cerrar algo que ya estaba cerrado no programa ninguna salida', () => {
    expect(run(CLOSED, false)).toEqual([CLOSED])
  })

  it('sin movimiento, monta y desmonta en el acto', () => {
    expect(run(CLOSED, true, false)).toEqual([OPENED])
    expect(run(OPENED, false, false)).toEqual([CLOSED])
  })
})

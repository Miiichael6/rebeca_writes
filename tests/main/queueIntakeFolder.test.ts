import { describe, expect, it, vi } from 'vitest'
import { QueueIntake } from '../../src/main/application/queueIntake'

function setup(
  picked: string | null,
  files: string[]
): { intake: QueueIntake; add: ReturnType<typeof vi.fn> } {
  const add = vi.fn(async (items: unknown[]) => items.length)
  const intake = new QueueIntake({
    queue: { add },
    settings: { get: () => ({ model: 'base', language: 'auto', translate: false }) },
    expander: { expand: async () => ({ files, ignored: 2 }) },
    dialogs: { pickFolder: async () => picked }
  } as never)
  return { intake, add }
}

describe('QueueIntake: carpeta con confirmación', () => {
  it('cuenta los medios sin encolar nada hasta confirmar', async () => {
    const { intake, add } = setup('D:\\Clases', ['D:\\Clases\\a.mp4', 'D:\\Clases\\b.mp3'])
    expect(await intake.scanFolder(null)).toEqual({ folder: 'D:\\Clases', count: 2, ignored: 2 })
    expect(add).not.toHaveBeenCalled()
    expect(await intake.confirmScan(true)).toEqual({ added: 2, ignored: 0 })
    expect(add).toHaveBeenCalledTimes(1)
  })

  it('rechazar descarta la lista y confirmar después no encola nada', async () => {
    const { intake, add } = setup('D:\\Clases', ['D:\\Clases\\a.mp4'])
    await intake.scanFolder(null)
    expect(await intake.confirmScan(false)).toEqual({ added: 0, ignored: 0 })
    await intake.confirmScan(true)
    expect(add).toHaveBeenCalledWith([], expect.anything())
  })

  it('una carpeta sin medios informa count 0 y cancelar el diálogo devuelve null', async () => {
    expect((await setup('D:\\Vacía', []).intake.scanFolder(null))?.count).toBe(0)
    expect(await setup(null, []).intake.scanFolder(null)).toBeNull()
  })
})

import i18n from '@renderer/i18n'
import { toast } from '@renderer/store/toast'

const fileName = (path: string): string =>
  path.slice(Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/')) + 1)

/**
 * "Recortar" (tarea 39): el main escribe el tramo junto al original y, si se pidió, lo mete en
 * la cola. Aquí solo se avisa del resultado.
 */
export async function cutClip(
  entryId: string,
  start: number,
  end: number,
  transcribe: boolean
): Promise<void> {
  toast(i18n.t('clip.cutting'))
  try {
    const result = await window.api.clip.cut(entryId, start, end, transcribe)
    if (result.status === 'saved') {
      const key = result.queued ? 'clip.savedQueued' : 'clip.saved'
      toast(i18n.t(key, { name: fileName(result.path) }), 8000, {
        label: i18n.t('bottomBar.showInFolder'),
        onSelect: () => void window.api.clip.showInFolder(result.path)
      })
    } else {
      toast(i18n.t(`clip.${result.status}`), 5000)
    }
  } catch (err) {
    console.error('No se pudo recortar', err)
    toast(i18n.t('clip.failed'), 5000)
  }
}

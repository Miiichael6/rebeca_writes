import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Captions,
  FileClock,
  FileDown,
  FileText,
  Music,
  Subtitles,
  type LucideIcon
} from 'lucide-react'
import type { MenuItem } from '@renderer/components/ui'
import type { ExportFormat } from '@shared/exporters'
import { EXPORT_ENTRIES, isExportShortcut } from '../domain/export'
import { usePorts } from './ports'

export interface ExportMenu {
  open: boolean
  toggle: () => void
  close: () => void
  items: MenuItem[]
  /** Ruta del `.srt` que ya existe y espera confirmación para reemplazarlo. */
  replacePath: string | null
  confirmReplace: () => void
  cancelReplace: () => void
}

const FORMAT_ICONS: Record<ExportFormat, LucideIcon> = {
  txtTimestamps: FileClock,
  txt: FileText,
  vtt: Captions,
  lrc: Music,
  srt: Subtitles
}

/** El menú Exportar, su atajo `Ctrl+E` y la confirmación de reemplazar el `.srt` existente. */
export function useExportMenu(empty: boolean): ExportMenu {
  const { t } = useTranslation()
  const { transcript } = usePorts()
  const [open, setOpen] = useState(false)
  const [replacePath, setReplacePath] = useState<string | null>(null)
  const close = useCallback(() => setOpen(false), [])

  const items = useMemo(
    (): MenuItem[] => [
      ...EXPORT_ENTRIES.map(({ format, labelKey }) => ({
        label: t(`bottomBar.${labelKey}`),
        icon: FORMAT_ICONS[format],
        onSelect: () => transcript.exportAs(format)
      })),
      {
        label: t('bottomBar.saveSrtNextToFile'),
        icon: FileDown,
        onSelect: () => void transcript.saveSrtBeside().then(setReplacePath),
        separator: true
      }
    ],
    [t, transcript]
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!isExportShortcut(e)) return
      if (e.repeat || document.querySelector('dialog[open]')) return
      e.preventDefault()
      if (!empty) setOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [empty])

  return {
    open,
    toggle: () => setOpen((o) => !o),
    close,
    items,
    replacePath,
    confirmReplace: () => {
      setReplacePath(null)
      void transcript.saveSrtBeside(true)
    },
    cancelReplace: () => setReplacePath(null)
  }
}

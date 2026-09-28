import { Copy, Download } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { copyTranscript } from '@renderer/lib/copyTranscript'
import { exportAs, exportFileName, saveSrtNextToFile } from '@renderer/lib/exportTranscript'
import { useTranscriptStore } from '@renderer/store/transcript'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { Button, Checkbox, ConfirmDialog, Menu, type MenuItem } from './ui'

function BottomBar(): React.JSX.Element {
  const { t } = useTranslation()
  const joinLines = useSettingsStore((s) => s.settings.joinLines)
  const autoScroll = useSettingsStore((s) => s.settings.autoScroll)
  const segments = useTranscriptStore((s) => s.segments)
  const [exportOpen, setExportOpen] = useState(false)
  /** Ruta del `.srt` que ya existe y espera confirmación para reemplazarlo. */
  const [replacePath, setReplacePath] = useState<string | null>(null)
  const closeExport = useCallback(() => setExportOpen(false), [])
  const empty = segments.length === 0

  const exportItems = useMemo((): MenuItem[] => {
    const saveBeside = (): void => {
      void saveSrtNextToFile().then(setReplacePath)
    }
    return [
      { label: t('bottomBar.exportTxtTimestamps'), onSelect: () => void exportAs('txtTimestamps') },
      { label: t('bottomBar.exportTxt'), onSelect: () => void exportAs('txt') },
      { label: t('bottomBar.exportVtt'), onSelect: () => void exportAs('vtt') },
      { label: t('bottomBar.exportLrc'), onSelect: () => void exportAs('lrc') },
      { label: t('bottomBar.exportSrt'), onSelect: () => void exportAs('srt') },
      { label: t('bottomBar.saveSrtNextToFile'), onSelect: saveBeside, separator: true }
    ]
  }, [t])

  // Ctrl+E abre el menú Exportar (spec §6).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!e.ctrlKey || e.altKey || e.shiftKey || e.metaKey || e.key.toLowerCase() !== 'e') return
      if (e.repeat || document.querySelector('dialog[open]')) return
      e.preventDefault()
      if (!empty) setExportOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [empty])

  return (
    <footer className="bottombar">
      <Button
        size="sm"
        aria-label={t('bottomBar.copy')}
        title={t('bottomBar.copy')}
        icon={<Copy size={15} strokeWidth={1.5} />}
        disabled={empty}
        onClick={() => void copyTranscript()}
      />
      <Checkbox checked={joinLines} onChange={(value) => updateSettings({ joinLines: value })}>
        {t('bottomBar.joinLines')}
      </Checkbox>
      <span className="divider" />
      <Checkbox checked={autoScroll} onChange={(value) => updateSettings({ autoScroll: value })}>
        {t('bottomBar.autoScroll')}
      </Checkbox>
      <span className="spacer" />
      <div className="menu-anchor">
        <Button
          variant="outline"
          icon={<Download size={14} strokeWidth={1.5} />}
          aria-haspopup="menu"
          aria-expanded={exportOpen}
          aria-keyshortcuts="Control+E"
          title={`${t('bottomBar.export')} (Ctrl+E)`}
          disabled={empty}
          onClick={() => setExportOpen((o) => !o)}
        >
          {t('bottomBar.export')}
        </Button>
        <Menu
          open={exportOpen}
          onClose={closeExport}
          items={exportItems}
          placement="top-end"
          aria-label={t('bottomBar.export')}
        />
      </div>

      <ConfirmDialog
        open={replacePath !== null}
        title={t('bottomBar.replaceTitle')}
        confirmLabel={t('bottomBar.replace')}
        onConfirm={() => {
          setReplacePath(null)
          void saveSrtNextToFile(true)
        }}
        onCancel={() => setReplacePath(null)}
      >
        {t('bottomBar.replaceBody', { name: exportFileName(replacePath ?? '') })}
      </ConfirmDialog>
    </footer>
  )
}

export default BottomBar

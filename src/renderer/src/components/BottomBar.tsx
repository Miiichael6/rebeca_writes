import { Copy, Download } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { copyTranscript } from '@renderer/lib/copyTranscript'
import { toast } from '@renderer/store/toast'
import { useTranscriptStore } from '@renderer/store/transcript'
import { updateSettings, useSettingsStore } from '@renderer/store/settings'
import { Button, Checkbox, Menu, type MenuItem } from './ui'

function BottomBar(): React.JSX.Element {
  const { t } = useTranslation()
  const joinLines = useSettingsStore((s) => s.settings.joinLines)
  const autoScroll = useSettingsStore((s) => s.settings.autoScroll)
  const segments = useTranscriptStore((s) => s.segments)
  const [exportOpen, setExportOpen] = useState(false)
  const closeExport = useCallback(() => setExportOpen(false), [])
  const empty = segments.length === 0

  const exportItems = useMemo((): MenuItem[] => {
    // Los exportadores reales son de la tarea 20.
    const notYet = (): void => toast(t('bottomBar.exportComingSoon'))
    return [
      { label: t('bottomBar.exportTxtTimestamps'), onSelect: notYet },
      { label: t('bottomBar.exportTxt'), onSelect: notYet },
      { label: t('bottomBar.exportVtt'), onSelect: notYet },
      { label: t('bottomBar.exportLrc'), onSelect: notYet },
      { label: t('bottomBar.exportSrt'), onSelect: notYet },
      { label: t('bottomBar.saveSrtNextToFile'), onSelect: notYet, separator: true }
    ]
  }, [t])

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
    </footer>
  )
}

export default BottomBar

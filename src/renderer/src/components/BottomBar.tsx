import { Copy, Download } from 'lucide-react'
import { useCallback, useState } from 'react'
import { formatTimestamp } from '@renderer/lib/time'
import { toast } from '@renderer/store/toast'
import { useTranscriptStore } from '@renderer/store/transcript'
import { useUiStore } from '@renderer/store/ui'
import { Button, Checkbox, Menu, type MenuItem } from './ui'

// Los exportadores reales son de la tarea 20.
const notYet = (): void => toast('Exportar llegará en una próxima versión')

const exportItems: MenuItem[] = [
  { label: 'como .txt con marcas de tiempo...', onSelect: notYet },
  { label: 'como .txt...', onSelect: notYet },
  { label: 'como .vtt...', onSelect: notYet },
  { label: 'como .lrc...', onSelect: notYet },
  { label: 'como .srt...', onSelect: notYet },
  { label: 'Guardar .srt junto al archivo', onSelect: notYet, separator: true }
]

function BottomBar(): React.JSX.Element {
  const joinLines = useUiStore((s) => s.joinLines)
  const autoScroll = useUiStore((s) => s.autoScroll)
  const { setJoinLines, setAutoScroll } = useUiStore.getState()
  const segments = useTranscriptStore((s) => s.segments)
  const [exportOpen, setExportOpen] = useState(false)
  const closeExport = useCallback(() => setExportOpen(false), [])
  const empty = segments.length === 0

  // Copia simple, un segmento por línea. "Unir líneas" se aplica en la tarea 15.
  const copy = async (): Promise<void> => {
    const text = segments.map((s) => `[${formatTimestamp(s.start)}] ${s.text}`).join('\n')
    await navigator.clipboard.writeText(text)
    toast('Copiado')
  }

  return (
    <footer className="bottombar">
      <Button
        size="sm"
        aria-label="Copiar transcripción"
        icon={<Copy size={15} strokeWidth={1.5} />}
        disabled={empty}
        onClick={copy}
      />
      <Checkbox checked={joinLines} onChange={setJoinLines}>
        Unir líneas
      </Checkbox>
      <span className="divider" />
      <Checkbox checked={autoScroll} onChange={setAutoScroll}>
        Desplaz. auto
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
          Exportar
        </Button>
        <Menu
          open={exportOpen}
          onClose={closeExport}
          items={exportItems}
          placement="top-end"
          aria-label="Exportar"
        />
      </div>
    </footer>
  )
}

export default BottomBar

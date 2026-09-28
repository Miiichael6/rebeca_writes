import { Copy, Download, Mic } from 'lucide-react'
import { useState } from 'react'
import { Button, Checkbox } from './ui'

function BottomBar(): React.JSX.Element {
  const [joinLines, setJoinLines] = useState(true)
  const [autoScroll, setAutoScroll] = useState(true)

  return (
    <footer className="bottombar">
      <Button
        size="sm"
        aria-label="Copiar transcripción"
        icon={<Copy size={15} strokeWidth={1.5} />}
      />
      <Checkbox checked={joinLines} onChange={setJoinLines}>
        Unir líneas
      </Checkbox>
      <span className="divider" />
      <Checkbox checked={autoScroll} onChange={setAutoScroll}>
        Desplaz. auto
      </Checkbox>
      <span className="divider" />
      <Button size="sm" aria-label="Grabar audio" icon={<Mic size={15} strokeWidth={1.5} />} />
      <span className="spacer" />
      <Button variant="outline" icon={<Download size={14} strokeWidth={1.5} />}>
        Exportar
      </Button>
    </footer>
  )
}

export default BottomBar

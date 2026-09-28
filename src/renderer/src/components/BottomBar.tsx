import { Check, Copy, Download, Mic } from 'lucide-react'

function Checkbox({ label, checked }: { label: string; checked: boolean }): React.JSX.Element {
  return (
    <label className="checkbox">
      <input type="checkbox" defaultChecked={checked} />
      <span className="box">
        <Check size={14} strokeWidth={2.5} />
      </span>
      {label}
    </label>
  )
}

function BottomBar(): React.JSX.Element {
  return (
    <footer className="bottombar">
      <button
        className="btn btn-icon"
        aria-label="Copiar transcripción"
        title="Copiar transcripción"
      >
        <Copy size={15} strokeWidth={1.5} />
      </button>
      <Checkbox label="Unir líneas" checked />
      <span className="divider" />
      <Checkbox label="Desplaz. auto" checked />
      <span className="divider" />
      <button className="btn btn-icon" aria-label="Grabar audio" title="Grabar audio">
        <Mic size={15} strokeWidth={1.5} />
      </button>
      <span className="spacer" />
      <button className="btn btn-outline-accent">
        <Download size={14} strokeWidth={1.5} />
        Exportar
      </button>
    </footer>
  )
}

export default BottomBar

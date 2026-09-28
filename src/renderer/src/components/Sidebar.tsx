import { Eraser, ExternalLink, File, FolderOpen, Library } from 'lucide-react'
import { Button } from './ui'

const history = [
  {
    group: 'Hoy',
    items: [{ id: '1', name: '001 A Practical Example of Rebase.mp4' }]
  }
]

function Sidebar({ selectedId }: { selectedId: string }): React.JSX.Element {
  return (
    <aside className="sidebar">
      <div className="sidebar-actions">
        <Button icon={<FolderOpen size={16} strokeWidth={1.5} />}>Abrir archivo</Button>
        <Button aria-label="Borrar historial" icon={<Eraser size={16} strokeWidth={1.5} />} />
      </div>

      <input className="input" placeholder="Filtrar por..." aria-label="Filtrar historial" />

      <nav className="history">
        {history.map((g) => (
          <section className="history-group" key={g.group}>
            <h3>{g.group}</h3>
            {g.items.map((item) => (
              <button
                key={item.id}
                className={`history-item${item.id === selectedId ? ' selected' : ''}`}
                title={item.name}
              >
                <File size={16} strokeWidth={1.5} />
                <span>{item.name}</span>
              </button>
            ))}
          </section>
        ))}
      </nav>

      <Button className="queue-btn" icon={<Library size={16} strokeWidth={1.5} />}>
        Cola
        <ExternalLink size={14} strokeWidth={1.5} />
        <span className="queue-count">0</span>
      </Button>
    </aside>
  )
}

export default Sidebar

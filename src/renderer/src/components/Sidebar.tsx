import { Eraser, ExternalLink, File, FolderOpen, Library } from 'lucide-react'

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
        <button className="btn">
          <FolderOpen size={16} strokeWidth={1.5} />
          Abrir archivo
        </button>
        <button className="btn btn-icon" aria-label="Borrar historial" title="Borrar historial">
          <Eraser size={16} strokeWidth={1.5} />
        </button>
      </div>

      <input className="input" placeholder="Filtrar por..." />

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

      <button className="btn queue-btn">
        <Library size={16} strokeWidth={1.5} />
        Cola
        <ExternalLink size={14} strokeWidth={1.5} />
        <span className="queue-count">0</span>
      </button>
    </aside>
  )
}

export default Sidebar

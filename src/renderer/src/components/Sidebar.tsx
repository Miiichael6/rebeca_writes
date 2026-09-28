import { CircleAlert, Eraser, FileMusic, FileVideoCamera, FolderOpen, Library } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { mediaKindOf } from '@shared/media'
import type { HistoryEntry } from '@shared/types'
import { filterHistory } from '@renderer/lib/historyFilter'
import { groupHistory } from '@renderer/lib/historyGroups'
import { useHistoryStore } from '@renderer/store/history'
import { selectPendingCount, useQueueStore } from '@renderer/store/queue'
import { toast } from '@renderer/store/toast'
import { useUiStore } from '@renderer/store/ui'
import { Button, ConfirmDialog, Menu, type MenuItem } from './ui'

/** Nombre que se ve en el historial: el que puso el usuario o el del archivo. */
function shownName(entry: HistoryEntry): string {
  return entry.displayName ?? entry.fileName
}

/** Anillo de progreso pequeño para el ítem que se está transcribiendo. */
function ProgressRing({ value }: { value: number }): React.JSX.Element {
  const r = 6
  const c = 2 * Math.PI * r
  return (
    <svg className="progress-ring" width={16} height={16} viewBox="0 0 16 16" aria-hidden>
      <circle cx={8} cy={8} r={r} className="progress-ring-track" />
      <circle
        cx={8}
        cy={8}
        r={r}
        className="progress-ring-value"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
      />
    </svg>
  )
}

function HistoryItem({
  entry,
  selected,
  onSelect,
  onContextMenu
}: {
  entry: HistoryEntry
  selected: boolean
  onSelect: () => void
  onContextMenu: (e: MouseEvent<HTMLButtonElement>) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const Icon = mediaKindOf(entry.fileName) === 'audio' ? FileMusic : FileVideoCamera
  return (
    <button
      className={`history-item${selected ? ' selected' : ''}`}
      title={entry.filePath}
      aria-current={selected || undefined}
      onClick={onSelect}
      onContextMenu={onContextMenu}
    >
      <Icon size={16} strokeWidth={1.5} aria-hidden />
      <span className="history-item-name">{shownName(entry)}</span>
      {entry.status === 'transcribing' && (
        <span
          className="history-item-status"
          title={t('sidebar.transcribing', { value: entry.progress ?? 0 })}
        >
          <ProgressRing value={entry.progress ?? 0} />
        </span>
      )}
      {entry.status === 'error' && (
        <span className="history-item-status error" title={t('sidebar.error')}>
          <CircleAlert size={14} strokeWidth={1.75} />
        </span>
      )}
    </button>
  )
}

/** Diálogo abierto desde el menú contextual, sobre la entrada `entry`. */
type EntryDialog =
  | { kind: 'rename'; entry: HistoryEntry }
  | { kind: 'remove'; entry: HistoryEntry }
  | { kind: 'retranscribe'; entry: HistoryEntry }

function Sidebar(): React.JSX.Element {
  const { t } = useTranslation()
  const entries = useHistoryStore((s) => s.entries)
  const selectedId = useHistoryStore((s) => s.selectedId)
  const filter = useHistoryStore((s) => s.filter)
  const textMatches = useHistoryStore((s) => s.textMatches)
  const {
    select,
    setFilter,
    clear,
    openFile,
    rename,
    remove,
    retranscribe,
    hasEdits,
    showInFolder
  } = useHistoryStore.getState()
  const pendingCount = useQueueStore(selectPendingCount)
  const setQueueOpen = useUiStore((s) => s.setQueueOpen)
  const [confirmClear, setConfirmClear] = useState(false)
  const [menu, setMenu] = useState<{ entry: HistoryEntry; x: number; y: number } | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  const [dialog, setDialog] = useState<EntryDialog | null>(null)
  const [newName, setNewName] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)

  const groups = useMemo(
    () => groupHistory(filterHistory(entries, filter, textMatches)),
    [entries, filter, textMatches]
  )

  const queueAgain = async (entry: HistoryEntry): Promise<void> => {
    const added = await retranscribe(entry.id).catch(() => false)
    toast(
      t(added ? 'sidebar.retranscribeQueued' : 'sidebar.retranscribeFailed', {
        name: shownName(entry)
      })
    )
  }

  const menuItems: MenuItem[] = menu
    ? [
        { label: t('sidebar.menuOpen'), onSelect: () => select(menu.entry.id) },
        {
          label: t('sidebar.menuShowInFolder'),
          onSelect: () => void showInFolder(menu.entry.id)
        },
        {
          label: t('sidebar.menuRetranscribe'),
          onSelect: () => {
            const { entry } = menu
            void hasEdits(entry.id).then((edited) => {
              if (edited) setDialog({ kind: 'retranscribe', entry })
              else void queueAgain(entry)
            })
          }
        },
        {
          label: t('sidebar.menuRename'),
          separator: true,
          onSelect: () => {
            setNewName(shownName(menu.entry))
            setDialog({ kind: 'rename', entry: menu.entry })
          }
        },
        {
          label: t('sidebar.menuRemove'),
          onSelect: () => setDialog({ kind: 'remove', entry: menu.entry })
        }
      ]
    : []

  const openMenu = (entry: HistoryEntry, e: MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault()
    // Desde el teclado (Mayús+F10 / tecla Menú) no hay puntero: se abre bajo el ítem.
    const keyboard = e.clientX === 0 && e.clientY === 0
    const rect = e.currentTarget.getBoundingClientRect()
    setMenu({
      entry,
      x: keyboard ? rect.left + 20 : e.clientX,
      y: keyboard ? rect.bottom : e.clientY
    })
  }

  const confirmRename = (): void => {
    if (dialog?.kind !== 'rename') return
    void rename(dialog.entry.id, newName)
    setDialog(null)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-actions">
        <Button icon={<FolderOpen size={16} strokeWidth={1.5} />} onClick={() => void openFile()}>
          {t('sidebar.openFile')}
        </Button>
        <Button
          aria-label={t('sidebar.clearHistory')}
          icon={<Eraser size={16} strokeWidth={1.5} />}
          disabled={entries.length === 0}
          onClick={() => setConfirmClear(true)}
        />
      </div>

      <input
        className="input"
        type="search"
        placeholder={t('sidebar.filterPlaceholder')}
        aria-label={t('sidebar.filterLabel')}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <nav className="history" aria-label={t('sidebar.history')}>
        {groups.map((g) => (
          <section className="history-group" key={g.key}>
            <h3>{t(`historyGroups.${g.key}`)}</h3>
            {g.entries.map((entry) => (
              <HistoryItem
                key={entry.id}
                entry={entry}
                selected={entry.id === selectedId}
                onSelect={() => select(entry.id)}
                onContextMenu={(e) => openMenu(entry, e)}
              />
            ))}
          </section>
        ))}
        {groups.length === 0 && (
          <p className="history-empty">
            {entries.length === 0 ? t('sidebar.empty') : t('sidebar.noResults')}
          </p>
        )}
      </nav>

      {menu && (
        <div
          className="menu-anchor segment-menu"
          style={{
            left: Math.min(menu.x, window.innerWidth - 272),
            top: Math.min(menu.y, window.innerHeight - 200)
          }}
        >
          <Menu open onClose={closeMenu} items={menuItems} aria-label={t('sidebar.menuLabel')} />
        </div>
      )}

      <Button
        className="queue-btn"
        icon={<Library size={16} strokeWidth={1.5} />}
        onClick={() => setQueueOpen(true)}
      >
        {t('sidebar.queue')}
        {pendingCount > 0 && (
          <span className="queue-count" aria-label={t('sidebar.pending', { count: pendingCount })}>
            {pendingCount}
          </span>
        )}
      </Button>

      <ConfirmDialog
        open={confirmClear}
        title={t('sidebar.clearTitle')}
        confirmLabel={t('sidebar.clearConfirm')}
        danger
        onConfirm={() => {
          void clear()
          setConfirmClear(false)
        }}
        onCancel={() => setConfirmClear(false)}
      >
        {t('sidebar.clearBody')}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog?.kind === 'rename'}
        title={t('sidebar.renameTitle')}
        confirmLabel={t('sidebar.renameConfirm')}
        initialFocus={renameRef}
        onConfirm={confirmRename}
        onCancel={() => setDialog(null)}
      >
        <label className="dialog-field">
          {t('sidebar.renameLabel')}
          <input
            ref={renameRef}
            className="input"
            value={newName}
            placeholder={dialog?.entry.fileName}
            onChange={(e) => setNewName(e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                confirmRename()
              }
            }}
          />
        </label>
        <div className="dialog-hint">{t('sidebar.renameHint')}</div>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog?.kind === 'remove'}
        title={t('sidebar.removeTitle')}
        confirmLabel={t('sidebar.removeConfirm')}
        danger
        onConfirm={() => {
          if (dialog) void remove(dialog.entry.id)
          setDialog(null)
        }}
        onCancel={() => setDialog(null)}
      >
        {dialog && t('sidebar.removeBody', { name: shownName(dialog.entry) })}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog?.kind === 'retranscribe'}
        title={t('toolbar.retranscribeTitle')}
        confirmLabel={t('toolbar.retranscribe')}
        danger
        onConfirm={() => {
          if (dialog) void queueAgain(dialog.entry)
          setDialog(null)
        }}
        onCancel={() => setDialog(null)}
      >
        {t('toolbar.retranscribeBody')}
      </ConfirmDialog>
    </aside>
  )
}

export default Sidebar

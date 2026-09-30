import {
  Check,
  CircleAlert,
  Eraser,
  FileMusic,
  FileVideoCamera,
  FolderOpen,
  Library,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  X
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { mediaKindOf } from '@shared/media'
import type { HistoryEntry } from '@shared/types'
import { filterHistory } from '@renderer/lib/historyFilter'
import { groupHistory } from '@renderer/lib/historyGroups'
import { useListExit } from '@renderer/lib/useListExit'
import { useHistoryStore } from '@renderer/store/history'
import { selectPendingCount, useQueueStore } from '@renderer/store/queue'
import { toast } from '@renderer/store/toast'
import {
  SIDEBAR_WIDTH_DEFAULT,
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_MIN,
  useUiStore
} from '@renderer/store/ui'
import { Button, ConfirmDialog, ContextMenu, type MenuItem } from './ui'

/** Clave estable para `useListExit`; fuera del componente para no recrearla en cada render. */
const entryKey = (entry: HistoryEntry): string => entry.id

/** Cuánto hay que mantener presionado un ítem para empezar a seleccionar varios. */
const LONG_PRESS_MS = 500

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
  exiting,
  selecting,
  checked,
  onSelect,
  onLongPress,
  onContextMenu
}: {
  entry: HistoryEntry
  selected: boolean
  /** Ya no está en el historial (o no pasa el filtro): se pinta su salida antes de quitarla. */
  exiting: boolean
  /** Modo de selección múltiple: el clic marca o desmarca en vez de abrir. */
  selecting: boolean
  checked: boolean
  onSelect: () => void
  onLongPress: () => void
  onContextMenu: (e: MouseEvent<HTMLButtonElement>) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const Icon = mediaKindOf(entry.fileName) === 'audio' ? FileMusic : FileVideoCamera

  // Mantener presionado (sin mover el puntero) empieza la selección; el clic que sigue al
  // soltar se descarta para que no abra el archivo ni desmarque lo recién marcado.
  const press = useRef<{ timer: number; x: number; y: number } | null>(null)
  const longPressed = useRef(false)
  const cancelPress = (): void => {
    if (press.current) window.clearTimeout(press.current.timer)
    press.current = null
  }
  useEffect(() => cancelPress, [])

  return (
    <button
      className={`history-item${selected ? ' selected' : ''}${exiting ? ' exiting' : ''}${checked ? ' checked' : ''}`}
      title={entry.filePath}
      aria-current={selected || undefined}
      aria-pressed={selecting ? checked : undefined}
      onPointerDown={(e) => {
        if (e.button !== 0 || selecting) return
        longPressed.current = false
        press.current = {
          x: e.clientX,
          y: e.clientY,
          timer: window.setTimeout(() => {
            press.current = null
            longPressed.current = true
            onLongPress()
          }, LONG_PRESS_MS)
        }
      }}
      onPointerMove={(e) => {
        const p = press.current
        if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 6) cancelPress()
      }}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onPointerLeave={cancelPress}
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false
          return
        }
        onSelect()
      }}
      onContextMenu={onContextMenu}
    >
      {selecting && (
        <span className="history-check" aria-hidden>
          <Check size={12} strokeWidth={3} />
        </span>
      )}
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

/** Borde derecho del menú: arrastrar cambia el ancho (con límites), doble clic lo restablece. */
function ResizeEdge({
  onResizing
}: {
  onResizing: (resizing: boolean) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const width = useUiStore((s) => s.sidebarWidth)
  const { setSidebarWidth } = useUiStore.getState()
  return (
    <div
      className="sidebar-resize"
      role="separator"
      aria-orientation="vertical"
      aria-label={t('sidebar.resize')}
      aria-valuemin={SIDEBAR_WIDTH_MIN}
      aria-valuemax={SIDEBAR_WIDTH_MAX}
      aria-valuenow={width}
      tabIndex={0}
      onDoubleClick={() => setSidebarWidth(SIDEBAR_WIDTH_DEFAULT)}
      onPointerDown={(e) => {
        e.preventDefault()
        const el = e.currentTarget
        el.setPointerCapture(e.pointerId)
        const startX = e.clientX
        const startWidth = width
        onResizing(true)
        const move = (ev: PointerEvent): void =>
          setSidebarWidth(startWidth + ev.clientX - startX, false)
        const end = (): void => {
          el.removeEventListener('pointermove', move)
          el.removeEventListener('pointerup', end)
          el.removeEventListener('pointercancel', end)
          setSidebarWidth(useUiStore.getState().sidebarWidth)
          onResizing(false)
        }
        el.addEventListener('pointermove', move)
        el.addEventListener('pointerup', end)
        el.addEventListener('pointercancel', end)
      }}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
        e.preventDefault()
        setSidebarWidth(width + (e.key === 'ArrowRight' ? 16 : -16))
      }}
    />
  )
}

function Sidebar({ onResizing }: { onResizing: (resizing: boolean) => void }): React.JSX.Element {
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
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const [confirmClear, setConfirmClear] = useState(false)
  // Selección múltiple: `null` fuera del modo; dentro, los ids marcados.
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string> | null>(null)
  const [confirmRemoveMany, setConfirmRemoveMany] = useState(false)
  const [menu, setMenu] = useState<{ entry: HistoryEntry; x: number; y: number } | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  const [dialog, setDialog] = useState<EntryDialog | null>(null)
  const [newName, setNewName] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(
    () => filterHistory(entries, filter, textMatches),
    [entries, filter, textMatches]
  )
  // Las entradas quitadas siguen en su grupo mientras dura su animación de salida.
  const shown = useListExit(filtered, entryKey)
  const groups = useMemo(() => groupHistory(shown.items), [shown.items])

  const endSelection = (): void => setCheckedIds(null)
  const toggleChecked = (id: string): void =>
    setCheckedIds((prev) => {
      if (!prev) return prev
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  const removeChecked = async (): Promise<void> => {
    const ids = [...(checkedIds ?? [])].filter((id) => visibleIds.has(id))
    setConfirmRemoveMany(false)
    setCheckedIds(null)
    // De una en una: cada baja reescribe el historial en el main.
    for (const id of ids) await remove(id)
  }
  // Esc sale del modo, salvo que haya un diálogo abierto (que ya usa Esc para cerrarse).
  useEffect(() => {
    if (!checkedIds) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) setCheckedIds(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [checkedIds])
  // Las entradas que desaparecen del filtro o del historial dejan de estar marcadas.
  const visibleIds = useMemo(() => new Set(filtered.map((e) => e.id)), [filtered])
  const checkedCount = checkedIds ? [...checkedIds].filter((id) => visibleIds.has(id)).length : 0

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
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {checkedIds ? (
        <div className="sidebar-actions selection-bar">
          <Button
            aria-label={t('sidebar.cancelSelection')}
            title={t('sidebar.cancelSelection')}
            icon={<X size={16} strokeWidth={1.5} />}
            onClick={endSelection}
          />
          {!collapsed && (
            <span className="selection-count" role="status">
              {t('sidebar.selectedCount', { count: checkedCount })}
            </span>
          )}
          <Button
            aria-label={t('sidebar.selectAll')}
            title={t('sidebar.selectAll')}
            icon={<Check size={16} strokeWidth={1.5} />}
            disabled={checkedCount === filtered.length}
            onClick={() => setCheckedIds(new Set(filtered.map((e) => e.id)))}
          />
          <Button
            variant="primary"
            aria-label={t('sidebar.deleteSelected')}
            title={t('sidebar.deleteSelected')}
            icon={<Trash2 size={16} strokeWidth={1.5} />}
            disabled={checkedCount === 0}
            onClick={() => setConfirmRemoveMany(true)}
          />
        </div>
      ) : (
        <div className="sidebar-actions">
          <Button
            aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            aria-expanded={!collapsed}
            icon={
              collapsed ? (
                <PanelLeftOpen size={16} strokeWidth={1.5} />
              ) : (
                <PanelLeftClose size={16} strokeWidth={1.5} />
              )
            }
            onClick={toggleSidebar}
          />
          <Button
            icon={<FolderOpen size={16} strokeWidth={1.5} />}
            title={`${t('sidebar.openFile')} (Ctrl+O)`}
            aria-label={collapsed ? t('sidebar.openFile') : undefined}
            aria-keyshortcuts="Control+O"
            onClick={() => void openFile()}
          >
            {collapsed ? null : t('sidebar.openFile')}
          </Button>
          {!collapsed && (
            <Button
              aria-label={t('sidebar.clearHistory')}
              icon={<Eraser size={16} strokeWidth={1.5} />}
              disabled={entries.length === 0}
              onClick={() => setConfirmClear(true)}
            />
          )}
        </div>
      )}

      {!collapsed && (
        <input
          className="input"
          type="search"
          placeholder={t('sidebar.filterPlaceholder')}
          aria-label={t('sidebar.filterLabel')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}

      <nav className="history" aria-label={t('sidebar.history')}>
        {groups.map((g) => (
          <section className="history-group" key={g.key}>
            <h3>{t(`historyGroups.${g.key}`)}</h3>
            {g.entries.map((entry) => (
              <HistoryItem
                key={entry.id}
                entry={entry}
                selected={entry.id === selectedId}
                exiting={shown.exiting.has(entry.id)}
                selecting={checkedIds !== null}
                checked={checkedIds?.has(entry.id) ?? false}
                onSelect={() => (checkedIds ? toggleChecked(entry.id) : select(entry.id))}
                onLongPress={() => setCheckedIds(new Set([entry.id]))}
                onContextMenu={(e) => (checkedIds ? e.preventDefault() : openMenu(entry, e))}
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

      <ContextMenu
        at={menu}
        onClose={closeMenu}
        items={menuItems}
        height={200}
        aria-label={t('sidebar.menuLabel')}
      />

      <Button
        className="queue-btn"
        icon={<Library size={16} strokeWidth={1.5} />}
        aria-label={collapsed ? t('sidebar.queue') : undefined}
        title={collapsed ? t('sidebar.queue') : undefined}
        onClick={() => setQueueOpen(true)}
      >
        {collapsed ? null : t('sidebar.queue')}
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
        open={confirmRemoveMany}
        title={t('sidebar.removeManyTitle', { count: checkedCount })}
        confirmLabel={t('sidebar.removeConfirm')}
        danger
        onConfirm={() => void removeChecked()}
        onCancel={() => setConfirmRemoveMany(false)}
      >
        {t('sidebar.removeManyBody', { count: checkedCount })}
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
      {!collapsed && <ResizeEdge onResizing={onResizing} />}
    </aside>
  )
}

export default Sidebar

import { Library } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePorts } from '../application/ports'
import { useEntryActions } from '../application/useEntryActions'
import { useHistoryList } from '../application/useHistoryList'
import { useMultiSelect } from '../application/useMultiSelect'
import { Button, ContextMenu, type MenuItem } from '../../ui'
import { EntryDialogs } from './EntryDialogs'
import { HistoryList } from './HistoryList'
import { ResizeEdge } from './ResizeEdge'
import { SidebarActions } from './SidebarActions'

export function Sidebar({
  onResizing
}: {
  onResizing: (resizing: boolean) => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const { history, queue, layout } = usePorts()
  const collapsed = layout.useCollapsed()
  const pendingCount = queue.usePendingCount()
  const list = useHistoryList()
  const select = useMultiSelect(list.filtered, list.visibleIds)
  const actions = useEntryActions({
    requeueMessage: (added, name) =>
      t(added ? 'sidebar.retranscribeQueued' : 'sidebar.retranscribeFailed', { name })
  })
  const [confirmClear, setConfirmClear] = useState(false)

  const { menu } = actions
  const menuItems: MenuItem[] = menu
    ? [
        { label: t('sidebar.menuOpen'), onSelect: () => history.select(menu.entry.id) },
        {
          label: t('sidebar.menuShowInFolder'),
          onSelect: () => void history.showInFolder(menu.entry.id)
        },
        {
          label: t('sidebar.menuRetranscribe'),
          onSelect: () => actions.retranscribe(menu.entry)
        },
        {
          label: t('sidebar.menuRename'),
          separator: true,
          onSelect: () => actions.startRename(menu.entry)
        },
        {
          label: t('sidebar.menuRemove'),
          onSelect: () => actions.askRemove(menu.entry)
        }
      ]
    : []

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <SidebarActions
        collapsed={collapsed}
        select={select}
        filteredCount={list.filtered.length}
        totalCount={list.entries.length}
        onAskClear={() => setConfirmClear(true)}
      />

      {!collapsed && (
        <input
          className="input"
          type="search"
          placeholder={t('sidebar.filterPlaceholder')}
          aria-label={t('sidebar.filterLabel')}
          value={list.filter}
          onChange={(e) => history.setFilter(e.target.value)}
        />
      )}

      <HistoryList list={list} select={select} actions={actions} />

      <ContextMenu
        at={menu}
        onClose={actions.closeMenu}
        items={menuItems}
        height={200}
        aria-label={t('sidebar.menuLabel')}
      />

      <Button
        className="queue-btn"
        icon={<Library size={16} strokeWidth={1.5} />}
        aria-label={collapsed ? t('sidebar.queue') : undefined}
        title={collapsed ? t('sidebar.queue') : undefined}
        onClick={queue.openPanel}
      >
        {collapsed ? null : t('sidebar.queue')}
        {pendingCount > 0 && (
          <span className="queue-count" aria-label={t('sidebar.pending', { count: pendingCount })}>
            {pendingCount}
          </span>
        )}
      </Button>

      <EntryDialogs
        actions={actions}
        select={select}
        confirmClear={confirmClear}
        onCancelClear={() => setConfirmClear(false)}
      />
      {!collapsed && <ResizeEdge onResizing={onResizing} />}
    </aside>
  )
}

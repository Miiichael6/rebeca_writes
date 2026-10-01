import { Copy, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePorts } from '../application/ports'
import { useExportMenu } from '../application/useExportMenu'
import { Button, Checkbox, ConfirmDialog, Menu } from '../../ui'

/** Barra inferior: copiar, opciones de lectura y menú Exportar. */
export function BottomBar(): React.JSX.Element {
  const { t } = useTranslation()
  const { settings, transcript } = usePorts()
  const { joinLines, autoScroll } = settings.useOptions()
  const empty = transcript.useIsEmpty()
  const exportMenu = useExportMenu(empty)

  return (
    <footer className="bottombar">
      <Button
        size="sm"
        aria-label={t('bottomBar.copy')}
        title={t('bottomBar.copy')}
        icon={<Copy size={15} strokeWidth={1.5} />}
        disabled={empty}
        onClick={transcript.copy}
      />
      <Checkbox checked={joinLines} onChange={settings.setJoinLines}>
        {t('bottomBar.joinLines')}
      </Checkbox>
      <span className="divider" />
      <Checkbox checked={autoScroll} onChange={settings.setAutoScroll}>
        {t('bottomBar.autoScroll')}
      </Checkbox>
      <span className="spacer" />
      <div className="menu-anchor">
        <Button
          variant="outline"
          icon={<Download size={14} strokeWidth={1.5} />}
          aria-haspopup="menu"
          aria-expanded={exportMenu.open}
          aria-keyshortcuts="Control+E"
          title={`${t('bottomBar.export')} (Ctrl+E)`}
          disabled={empty}
          onClick={exportMenu.toggle}
        >
          {t('bottomBar.export')}
        </Button>
        <Menu
          open={exportMenu.open}
          onClose={exportMenu.close}
          items={exportMenu.items}
          placement="top-end"
          aria-label={t('bottomBar.export')}
        />
      </div>

      <ConfirmDialog
        open={exportMenu.replacePath !== null}
        title={t('bottomBar.replaceTitle')}
        confirmLabel={t('bottomBar.replace')}
        onConfirm={exportMenu.confirmReplace}
        onCancel={exportMenu.cancelReplace}
      >
        {t('bottomBar.replaceBody', { name: transcript.fileName(exportMenu.replacePath ?? '') })}
      </ConfirmDialog>
    </footer>
  )
}

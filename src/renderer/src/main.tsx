// Fuentes empaquetadas con la app (sin red): Figtree para el texto, EB Garamond para los títulos.
import '@fontsource-variable/figtree'
import '@fontsource-variable/eb-garamond'
import '@fontsource-variable/eb-garamond/wght-italic.css'
import './styles/tokens.css'
import './styles/motion.css'
import './styles/theme-light.css'
import './styles/theme-dark.css'
import './styles/base.css'
import './styles/components.css'
import './styles/app.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app'
import { DockApp } from './dock/DockApp'
import { DockMenu } from './dock/DockMenu'
import { APP_NAME } from '@shared/app'
import { initI18n } from './i18n'
import { loadSettings } from './store/settings'
import { useUiStore } from './store/ui'

/** El dock y su menú cargan este mismo renderer en su ventana, con su ruta en el hash. */
const PAGES: Partial<Record<string, () => React.JSX.Element>> = {
  '#/dock': DockApp,
  '#/dock-menu': DockMenu
}
const DockPage = PAGES[window.location.hash]
const Page = DockPage ?? App
// Las ventanas del dock son transparentes: sin el fondo de la app.
if (DockPage) document.documentElement.dataset.page = 'dock'

// Antes del primer render, para no pintar un cuadro con el tema equivocado.
document.documentElement.dataset.theme = useUiStore.getState().resolvedTheme

window.api.app.getVersion().then((version) => console.info(`${APP_NAME} v${version}`))

// Settings e idioma antes del primer render, para no pintar con valores por defecto.
loadSettings()
  .then((settings) => settings.uiLanguage)
  .catch((err) => {
    console.error('No se pudieron leer los settings', err)
    return 'system' as const
  })
  .then(initI18n)
  .then(() =>
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <Page />
      </StrictMode>
    )
  )

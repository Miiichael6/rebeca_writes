import './styles/tokens.css'
import './styles/theme-light.css'
import './styles/theme-dark.css'
import './styles/base.css'
import './styles/components.css'
import './styles/app.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { APP_NAME } from '@shared/app'
import { useUiStore } from './store/ui'

// Antes del primer render, para no pintar un cuadro con el tema equivocado.
document.documentElement.dataset.theme = useUiStore.getState().resolvedTheme

window.api.app.getVersion().then((version) => console.info(`${APP_NAME} v${version}`))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

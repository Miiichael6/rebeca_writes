import type { ReactNode } from 'react'
import { APP_NAME } from '@shared/app'
import logo from '../assets/logo.svg'

/**
 * Barra de título propia. Toda la barra sirve para arrastrar la ventana; los botones
 * min/max/cerrar los pone Windows encima (titleBarOverlay), por eso el ancho se limita a
 * `titlebar-area-width`. Los controles que se pongan en `children` no arrastran.
 */
function TitleBar({ children }: { children?: ReactNode }): React.JSX.Element {
  return (
    <header className="titlebar">
      <img className="titlebar-logo" src={logo} alt="" width={16} height={16} />
      <span className="titlebar-title">{APP_NAME}</span>
      <span className="titlebar-spacer" />
      {children && <div className="titlebar-actions">{children}</div>}
    </header>
  )
}

export default TitleBar

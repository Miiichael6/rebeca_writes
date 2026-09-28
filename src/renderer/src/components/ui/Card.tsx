import type { ReactNode } from 'react'

/** Título de sección + sus tarjetas (p. ej. "Modelos", "Interfaz" en Configuración). */
export function SettingsSection({
  title,
  children
}: {
  title: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <section className="settings-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

export function Card({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="card">{children}</div>
}

export interface SettingRowProps {
  icon?: ReactNode
  title: string
  description?: ReactNode
  /** Control a la derecha (Toggle, Select, NumberInput...). */
  children?: ReactNode
  /** Contenido debajo de la fila, en una zona separada (p. ej. radios o un área de texto). */
  extra?: ReactNode
}

/** Tarjeta de ajuste: ícono + título + descripción + control a la derecha. */
export function SettingRow({
  icon,
  title,
  description,
  children,
  extra
}: SettingRowProps): React.JSX.Element {
  return (
    <Card>
      <div className="setting-row">
        {icon && (
          <span className="setting-row-icon" aria-hidden>
            {icon}
          </span>
        )}
        <div className="setting-row-text">
          <div className="setting-row-title">{title}</div>
          {description && <div className="setting-row-description">{description}</div>}
        </div>
        {children && <div className="setting-row-control">{children}</div>}
      </div>
      {extra && <div className="setting-row-extra">{extra}</div>}
    </Card>
  )
}

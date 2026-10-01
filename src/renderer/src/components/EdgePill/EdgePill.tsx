import type { LucideIcon } from 'lucide-react'

/** Alturas de las barras de la onda, en % del centro de la píldora (las de Rebecca Listen). */
const BARS = [30, 55, 80, 100, 70, 90, 60, 40, 25]
/** Cada barra rebota un poco después que la anterior. */
const BAR_DELAY_MS = 90
const ICON_SIZE = 12
const ICON_STROKE = 2.2

/** Un extremo de la píldora: botón con `onClick`, o solo indicador si no lo tiene. */
export interface EdgePillButton {
  icon: LucideIcon
  title: string
  onClick?: () => void
}

export interface EdgePillProps {
  /** Pegada al borde: solo una barra negra, esperando al ratón. */
  collapsed: boolean
  /** Borde azul y onda en movimiento (grabando). */
  active: boolean
  /** En el centro en vez de la onda. */
  question: string | null
  /** Título completo de la pregunta, por si no cabe. */
  questionTitle?: string
  left: EdgePillButton | null
  right: EdgePillButton | null
  onHover: () => void
}

function PillButton({ button }: { button: EdgePillButton }): React.JSX.Element {
  const Icon = button.icon
  const icon = <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
  if (!button.onClick) {
    return (
      <span className="edge-pill-button edge-pill-indicator" title={button.title} role="img">
        {icon}
      </span>
    )
  }
  return (
    <button
      type="button"
      className="edge-pill-button"
      title={button.title}
      aria-label={button.title}
      onClick={button.onClick}
    >
      {icon}
    </button>
  )
}

/**
 * La píldora del dock (tarea 30, copiada de Rebecca Listen): cristal oscuro con borde blanco,
 * un botón redondo en cada extremo y, entre ellos, la onda o una pregunta. Escondida, es una
 * barra negra en el borde. Solo presentacional: quien la usa decide qué hace cada botón.
 */
export function EdgePill(props: EdgePillProps): React.JSX.Element {
  const { collapsed, active, question, questionTitle, left, right, onHover } = props
  const activeClass = active ? ' edge-pill-active' : ''
  if (collapsed) return <div className={`edge-pill-bar${activeClass}`} onMouseEnter={onHover} />

  // El área del ratón es toda la ventana (tan alta como la barra), no solo la píldora: el ratón
  // que la sacó no debe contar como que se fue.
  return (
    <div className="edge-pill-area" onMouseEnter={onHover}>
      <div className={`edge-pill${activeClass}`}>
        {left && <PillButton button={left} />}
        {question ? (
          <span className="edge-pill-question" title={questionTitle}>
            {question}
          </span>
        ) : (
          <span className="edge-pill-wave" aria-hidden="true">
            {BARS.map((height, index) => (
              <i
                key={index}
                style={{ height: `${height}%`, animationDelay: `${index * BAR_DELAY_MS}ms` }}
              />
            ))}
          </span>
        )}
        {right && <PillButton button={right} />}
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { DOCK_CONTRACT_MS } from '@shared/dock'

/** Alturas de la onda quieta, en % del centro de la píldora (las de Rebecca Listen). */
const BARS = [30, 55, 80, 100, 70, 90, 60, 40, 25]
/** Cuántos niveles dibuja la onda en vivo: una barra por nivel. */
export const EDGE_PILL_BARS = BARS.length
/** Altura mínima de una barra en vivo, para que el silencio siga pareciendo una onda. */
const MIN_LEVEL_PCT = 12
const ICON_SIZE = 12
const ICON_STROKE = 2.2

/** Un extremo de la píldora: botón con `onClick`, o solo indicador si no lo tiene. */
export interface EdgePillButton {
  icon: LucideIcon
  /** Clase extra del icono, para una entrada propia. */
  iconClass?: string
  title: string
  onClick?: () => void
}

export interface EdgePillProps {
  /** Pegada al borde: solo una barra negra, esperando al ratón. */
  collapsed: boolean
  /** Borde azul (grabando). */
  active: boolean
  /** Niveles (0..1) de lo que se graba, uno por barra; sin ellos la onda queda quieta. */
  levels?: number[]
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
  // La clave (el título) remonta el icono al cambiar de acción, y con ello su animación.
  const icon = (
    <span key={button.title} className={`edge-pill-icon ${button.iconClass ?? ''}`.trim()}>
      <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
    </span>
  )
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
 * Al pasar de fuera a escondida, la píldora sigue dibujada `DOCK_CONTRACT_MS` más para
 * contraerse como una gota antes de volverse la barra (tarea 34).
 */
function useContractingAsDrop(collapsed: boolean): boolean {
  const [contracting, setContracting] = useState(false)
  const wasCollapsed = useRef(collapsed)
  useEffect(() => {
    const justCollapsed = collapsed && !wasCollapsed.current
    wasCollapsed.current = collapsed
    if (!justCollapsed) {
      setContracting(false)
      return
    }
    setContracting(true)
    const timer = setTimeout(() => setContracting(false), DOCK_CONTRACT_MS)
    return () => clearTimeout(timer)
  }, [collapsed])
  return contracting
}

/**
 * La píldora del dock (tarea 30, copiada de Rebecca Listen): cristal oscuro con borde blanco,
 * un botón redondo en cada extremo y, entre ellos, la onda o una pregunta. Escondida, es una
 * barra negra en el borde. Solo presentacional: quien la usa decide qué hace cada botón.
 */
export function EdgePill(props: EdgePillProps): React.JSX.Element {
  const { collapsed, active, levels, question, questionTitle, left, right, onHover } = props
  const activeClass = active ? ' edge-pill-active' : ''
  const contracting = useContractingAsDrop(collapsed)
  if (collapsed && !contracting) return <div className={`edge-pill-bar${activeClass}`} onMouseEnter={onHover} />

  const heights = levels?.map((level) => Math.max(MIN_LEVEL_PCT, level * 100)) ?? BARS

  // El área del ratón es toda la ventana (tan alta como la barra), no solo la píldora: el ratón
  // que la sacó no debe contar como que se fue.
  return (
    <div className="edge-pill-area" onMouseEnter={onHover}>
      <div className={`edge-pill${activeClass}${contracting ? ' edge-pill-contract' : ''}`}>
        {left && <PillButton button={left} />}
        {question ? (
          <span className="edge-pill-question" title={questionTitle}>
            {question}
          </span>
        ) : (
          <span className="edge-pill-wave" aria-hidden="true">
            {heights.map((height, index) => (
              <i key={index} style={{ height: `${height}%` }} />
            ))}
          </span>
        )}
        {right && <PillButton button={right} />}
      </div>
    </div>
  )
}

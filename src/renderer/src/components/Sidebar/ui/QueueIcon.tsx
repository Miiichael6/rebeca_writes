/** Icono de la cola: una línea larga (el trabajo en curso) y dos cortas (los pendientes). */
export function QueueIcon({ size = 16, strokeWidth = 1.5 }): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M3 12h10" />
      <path d="M3 18h10" />
    </svg>
  )
}

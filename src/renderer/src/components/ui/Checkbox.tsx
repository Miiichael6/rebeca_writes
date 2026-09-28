import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

export interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
  disabled?: boolean
  className?: string
}

export function Checkbox({
  checked,
  onChange,
  children,
  disabled,
  className
}: CheckboxProps): React.JSX.Element {
  return (
    <label className={className ? `checkbox ${className}` : 'checkbox'}>
      {/* Oculto visualmente pero no con display:none, para que siga siendo enfocable. */}
      <input
        type="checkbox"
        className="visually-hidden"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="checkbox-box" aria-hidden>
        <Check size={14} strokeWidth={2.5} />
      </span>
      {children}
    </label>
  )
}

import { ChevronDown } from 'lucide-react'
import type { CSSProperties } from 'react'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

export interface SelectProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: SelectOption<T>[]
  /** Si no hay `<label htmlFor>` asociada, `aria-label` da el nombre accesible. */
  'aria-label'?: string
  id?: string
  disabled?: boolean
  style?: CSSProperties
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  id,
  disabled,
  style,
  ...rest
}: SelectProps<T>): React.JSX.Element {
  return (
    <div className="field select">
      <select
        id={id}
        value={value}
        disabled={disabled}
        style={style}
        aria-label={rest['aria-label']}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} strokeWidth={1.5} aria-hidden />
    </div>
  )
}

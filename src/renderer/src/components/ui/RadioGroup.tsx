import { useId } from 'react'

export interface RadioOption<T extends string> {
  value: T
  label: string
  description?: string
  disabled?: boolean
}

export interface RadioGroupProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: RadioOption<T>[]
  'aria-label': string
}

/** Grupo de radios con descripción opcional al lado (como el selector de Backend). */
export function RadioGroup<T extends string>({
  value,
  onChange,
  options,
  ...rest
}: RadioGroupProps<T>): React.JSX.Element {
  const name = useId()
  return (
    <div role="radiogroup" aria-label={rest['aria-label']} className="radio-group">
      {options.map((option) => (
        <label className="radio" key={option.value}>
          <input
            type="radio"
            className="visually-hidden"
            name={name}
            value={option.value}
            checked={option.value === value}
            disabled={option.disabled}
            onChange={() => onChange(option.value)}
          />
          <span className="radio-dot" aria-hidden />
          <span className="radio-text">
            <span className="radio-label">{option.label}</span>
            {option.description && <span className="radio-description">{option.description}</span>}
          </span>
        </label>
      ))}
    </div>
  )
}

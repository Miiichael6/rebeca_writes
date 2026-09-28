import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

export type ButtonVariant = 'secondary' | 'primary' | 'danger' | 'outline' | 'ghost'

type BaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  variant?: ButtonVariant
  size?: 'md' | 'sm'
  icon?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

/** Un botón de solo ícono no tiene texto visible, así que `aria-label` es obligatorio. */
export type ButtonProps = BaseProps &
  ({ children: ReactNode } | { children?: undefined; 'aria-label': string })

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps): React.JSX.Element {
  const iconOnly = children === undefined
  const classes = ['btn', `btn-${variant}`]
  if (size === 'sm') classes.push('btn-sm')
  if (iconOnly) classes.push('btn-icon-only')
  if (className) classes.push(className)

  return (
    <button
      type={type}
      className={classes.join(' ')}
      // Tooltip con el mismo texto que el nombre accesible cuando no hay texto visible.
      title={iconOnly ? rest['aria-label'] : undefined}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

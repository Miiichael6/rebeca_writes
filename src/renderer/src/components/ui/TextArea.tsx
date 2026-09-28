import type { TextareaHTMLAttributes } from 'react'

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export function TextArea({ className, ...rest }: TextAreaProps): React.JSX.Element {
  return <textarea className={className ? `textarea ${className}` : 'textarea'} {...rest} />
}

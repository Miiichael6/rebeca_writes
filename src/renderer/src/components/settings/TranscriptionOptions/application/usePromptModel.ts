import { approxTokens, isPromptTooLong } from '../domain/options'
import { usePorts } from './ports'

export interface PromptModel {
  enabled: boolean
  prompt: string
  tokens: number
  tooLong: boolean
  setEnabled: (enabled: boolean) => void
  setPrompt: (prompt: string) => void
}

/** Prompt inicial: texto, interruptor y aviso cuando excede el contexto de whisper. */
export function usePromptModel(): PromptModel {
  const { options } = usePorts()
  const { promptEnabled, prompt } = options.useValues()
  const tokens = approxTokens(prompt)
  return {
    enabled: promptEnabled,
    prompt,
    tokens,
    tooLong: isPromptTooLong(tokens),
    setEnabled: (enabled) => options.update({ promptEnabled: enabled }),
    setPrompt: (text) => options.update({ prompt: text })
  }
}

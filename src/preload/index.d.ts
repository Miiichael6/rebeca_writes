import type { TranscribaApi } from '../shared/ipc'

declare global {
  interface Window {
    api: TranscribaApi
  }
}

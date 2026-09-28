import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IpcChannel, type IpcEventMap, type IpcInvokeMap, type TranscribaApi } from '@shared/ipc'

function invoke<C extends keyof IpcInvokeMap>(
  channel: C,
  ...args: IpcInvokeMap[C]['args']
): Promise<IpcInvokeMap[C]['result']> {
  return ipcRenderer.invoke(channel, ...args)
}

/** Suscribe a un evento del main y devuelve la función para cancelar la suscripción. */
function on<C extends keyof IpcEventMap>(
  channel: C,
  listener: (payload: IpcEventMap[C]) => void
): () => void {
  const wrapped = (_event: IpcRendererEvent, payload: IpcEventMap[C]): void => listener(payload)
  ipcRenderer.on(channel, wrapped)
  return () => ipcRenderer.removeListener(channel, wrapped)
}

// Solo funciones concretas: el renderer nunca recibe `ipcRenderer`.
const api: TranscribaApi = {
  app: {
    getVersion: () => invoke(IpcChannel.AppGetVersion),
    getPreferredLanguages: () => invoke(IpcChannel.AppGetPreferredLanguages)
  },
  theme: {
    getResolved: () => invoke(IpcChannel.ThemeGetResolved),
    setMode: (mode) => invoke(IpcChannel.ThemeSetMode, mode),
    onChanged: (listener) => on(IpcChannel.ThemeChanged, listener)
  },
  backend: {
    getInfo: () => invoke(IpcChannel.BackendGetInfo),
    onFallback: (listener) => on(IpcChannel.BackendFallback, listener)
  }
}

contextBridge.exposeInMainWorld('api', api)

import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel, type IpcInvokeMap, type TranscribaApi } from '@shared/ipc'

function invoke<C extends keyof IpcInvokeMap>(
  channel: C,
  ...args: IpcInvokeMap[C]['args']
): Promise<IpcInvokeMap[C]['result']> {
  return ipcRenderer.invoke(channel, ...args)
}

// Solo funciones concretas: el renderer nunca recibe `ipcRenderer`.
const api: TranscribaApi = {
  app: {
    getVersion: () => invoke(IpcChannel.AppGetVersion)
  }
}

contextBridge.exposeInMainWorld('api', api)

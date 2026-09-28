import { app, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IpcChannel, type IpcInvokeMap } from '@shared/ipc'

type Handler<C extends keyof IpcInvokeMap> = (
  event: IpcMainInvokeEvent,
  ...args: IpcInvokeMap[C]['args']
) => IpcInvokeMap[C]['result'] | Promise<IpcInvokeMap[C]['result']>

function handle<C extends keyof IpcInvokeMap>(channel: C, handler: Handler<C>): void {
  ipcMain.handle(channel, handler as Parameters<typeof ipcMain.handle>[1])
}

export function registerIpcHandlers(): void {
  handle(IpcChannel.AppGetVersion, () => app.getVersion())
}

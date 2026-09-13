import type { IpcMain } from 'electron'
import { ModStateRepository } from './ModStateRepository'
import { ModStateIpcHandler } from './ModStateIpcHandler'

export { ModStateRepository, ModStateIpcHandler }

export function register(deps: { ipcMain: IpcMain }): void {
  const repo = new ModStateRepository()
  new ModStateIpcHandler(deps.ipcMain, repo).register()
}

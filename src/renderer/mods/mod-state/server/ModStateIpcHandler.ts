import type { IpcMain } from 'electron'
import type { ModStateRepository } from './ModStateRepository'

export class ModStateIpcHandler {
  constructor(
    private readonly ipcMain: IpcMain,
    private readonly repo: ModStateRepository
  ) {}

  register(): void {
    this.ipcMain.on(
      'state:get-mod-state',
      (event, payload: { reqId: string; args: [string] }) => {
        const { reqId, args } = payload
        const [modId] = args
        try {
          const data = this.repo.get(modId)
          event.reply('kolly:reply', { reqId, data })
        } catch (e) {
          event.reply('kolly:reply', { reqId, error: true })
        }
      }
    )

    this.ipcMain.on(
      'state:set-mod-state',
      (event, payload: { reqId: string; args: [string, unknown] }) => {
        const { reqId, args } = payload
        const [modId, data] = args
        try {
          this.repo.set(modId, data)
          event.reply('kolly:reply', { reqId, data: null })
        } catch (e) {
          event.reply('kolly:reply', { reqId, error: true })
        }
      }
    )
  }
}

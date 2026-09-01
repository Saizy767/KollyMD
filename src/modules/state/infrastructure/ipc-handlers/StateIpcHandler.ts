import type { IpcMain } from 'electron'
import type { GetSidebarWidth } from '../../application/use-cases/GetSidebarWidth'
import type { SetSidebarWidth } from '../../application/use-cases/SetSidebarWidth'

export class StateIpcHandler {
  constructor(
    private readonly ipcMain: IpcMain,
    private readonly getSidebarWidth: GetSidebarWidth,
    private readonly setSidebarWidth: SetSidebarWidth
  ) {}

  register(): void {
    this.ipcMain.on('state:get-sidebar-width', (event, payload: { reqId: string }) => {
      const { reqId } = payload
      try {
        const width = this.getSidebarWidth.execute()
        event.reply('kolly:reply', { reqId, data: width })
      } catch (e) {
        event.reply('kolly:reply', { reqId, error: true })
      }
    })

    this.ipcMain.on(
      'state:set-sidebar-width',
      (event, payload: { reqId: string; args: [number] }) => {
        const { reqId, args } = payload
        const [width] = args
        try {
          this.setSidebarWidth.execute(width)
          event.reply('kolly:reply', { reqId, data: null })
        } catch (e) {
          event.reply('kolly:reply', { reqId, error: true })
        }
      }
    )
  }
}

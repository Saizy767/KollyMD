import type { IpcMain } from 'electron'
import type { GetSidebarWidth } from '../../application/use-cases/GetSidebarWidth'
import type { SetSidebarWidth } from '../../application/use-cases/SetSidebarWidth'
import type { GetActiveTabPath } from '../../application/use-cases/GetActiveTabPath'
import type { SetActiveTabPath } from '../../application/use-cases/SetActiveTabPath'
import type { GetExpandedFolders } from '../../application/use-cases/GetExpandedFolders'
import type { SetExpandedFolders } from '../../application/use-cases/SetExpandedFolders'

export class StateIpcHandler {
  constructor(
    private readonly ipcMain: IpcMain,
    private readonly getSidebarWidth: GetSidebarWidth,
    private readonly setSidebarWidth: SetSidebarWidth,
    private readonly getActiveTabPath: GetActiveTabPath,
    private readonly setActiveTabPath: SetActiveTabPath,
    private readonly getExpandedFolders: GetExpandedFolders,
    private readonly setExpandedFolders: SetExpandedFolders
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

    this.ipcMain.on('state:get-active-tab-path', (event, payload: { reqId: string }) => {
      const { reqId } = payload
      try {
        const path = this.getActiveTabPath.execute()
        event.reply('kolly:reply', { reqId, data: path })
      } catch (e) {
        event.reply('kolly:reply', { reqId, error: true })
      }
    })

    this.ipcMain.on(
      'state:set-active-tab-path',
      (event, payload: { reqId: string; args: [string | null] }) => {
        const { reqId, args } = payload
        const [path] = args
        try {
          this.setActiveTabPath.execute(path)
          event.reply('kolly:reply', { reqId, data: null })
        } catch (e) {
          event.reply('kolly:reply', { reqId, error: true })
        }
      }
    )

    this.ipcMain.on('state:get-expanded-folders', (event, payload: { reqId: string }) => {
      const { reqId } = payload
      try {
        const folders = this.getExpandedFolders.execute()
        event.reply('kolly:reply', { reqId, data: folders })
      } catch (e) {
        event.reply('kolly:reply', { reqId, error: true })
      }
    })

    this.ipcMain.on(
      'state:set-expanded-folders',
      (event, payload: { reqId: string; args: [string[]] }) => {
        const { reqId, args } = payload
        const [folders] = args
        try {
          this.setExpandedFolders.execute(folders)
          event.reply('kolly:reply', { reqId, data: null })
        } catch (e) {
          event.reply('kolly:reply', { reqId, error: true })
        }
      }
    )
  }
}

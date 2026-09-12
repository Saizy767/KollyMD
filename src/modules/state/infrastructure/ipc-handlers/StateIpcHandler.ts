import type { IpcMain } from 'electron'
import type { GetSidebarWidth } from '../../application/use-cases/GetSidebarWidth'
import type { SetSidebarWidth } from '../../application/use-cases/SetSidebarWidth'
import type { GetActiveTabPath } from '../../application/use-cases/GetActiveTabPath'
import type { SetActiveTabPath } from '../../application/use-cases/SetActiveTabPath'
import type { GetExpandedFolders } from '../../application/use-cases/GetExpandedFolders'
import type { SetExpandedFolders } from '../../application/use-cases/SetExpandedFolders'
import type { GetCommandBarButtons } from '../../application/use-cases/GetCommandBarButtons'
import type { SetCommandBarButtons } from '../../application/use-cases/SetCommandBarButtons'
import type { GetActivePanel } from '../../application/use-cases/GetActivePanel'
import type { SetActivePanel } from '../../application/use-cases/SetActivePanel'
import type { GetModState } from '../../application/use-cases/GetModState'
import type { SetModState } from '../../application/use-cases/SetModState'

export class StateIpcHandler {
  constructor(
    private readonly ipcMain: IpcMain,
    private readonly getSidebarWidth: GetSidebarWidth,
    private readonly setSidebarWidth: SetSidebarWidth,
    private readonly getActiveTabPath: GetActiveTabPath,
    private readonly setActiveTabPath: SetActiveTabPath,
    private readonly getExpandedFolders: GetExpandedFolders,
    private readonly setExpandedFolders: SetExpandedFolders,
    private readonly getCommandBarButtons: GetCommandBarButtons,
    private readonly setCommandBarButtons: SetCommandBarButtons,
    private readonly getActivePanel: GetActivePanel,
    private readonly setActivePanel: SetActivePanel,
    private readonly getModState: GetModState,
    private readonly setModState: SetModState
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

    this.ipcMain.on('state:get-command-bar-buttons', (event, payload: { reqId: string }) => {
      const { reqId } = payload
      try {
        const buttons = this.getCommandBarButtons.execute()
        event.reply('kolly:reply', { reqId, data: buttons })
      } catch (e) {
        event.reply('kolly:reply', { reqId, error: true })
      }
    })

    this.ipcMain.on(
      'state:set-command-bar-buttons',
      (event, payload: { reqId: string; args: [string[]] }) => {
        const { reqId, args } = payload
        const [buttonIds] = args
        try {
          this.setCommandBarButtons.execute(buttonIds)
          event.reply('kolly:reply', { reqId, data: null })
        } catch (e) {
          event.reply('kolly:reply', { reqId, error: true })
        }
      }
    )

    this.ipcMain.on('state:get-active-panel', (event, payload: { reqId: string }) => {
      const { reqId } = payload
      try {
        const panel = this.getActivePanel.execute()
        event.reply('kolly:reply', { reqId, data: panel })
      } catch (e) {
        event.reply('kolly:reply', { reqId, error: true })
      }
    })

    this.ipcMain.on(
      'state:set-active-panel',
      (event, payload: { reqId: string; args: [string | null] }) => {
        const { reqId, args } = payload
        const [panel] = args
        try {
          this.setActivePanel.execute(panel)
          event.reply('kolly:reply', { reqId, data: null })
        } catch (e) {
          event.reply('kolly:reply', { reqId, error: true })
        }
      }
    )

    this.ipcMain.on(
      'state:get-mod-state',
      (event, payload: { reqId: string; args: [string] }) => {
        const { reqId, args } = payload
        const [modId] = args
        try {
          const data = this.getModState.execute(modId)
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
          this.setModState.execute(modId, data)
          event.reply('kolly:reply', { reqId, data: null })
        } catch (e) {
          event.reply('kolly:reply', { reqId, error: true })
        }
      }
    )
  }
}

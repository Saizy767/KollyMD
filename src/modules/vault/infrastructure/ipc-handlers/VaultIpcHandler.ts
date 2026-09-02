import { IpcMain, dialog, BrowserWindow, Menu } from 'electron'
import type { OpenVault } from '../../application/use-cases/OpenVault'
import type { GetCurrentVault } from '../../application/use-cases/GetCurrentVault'
import type { ListNotes } from '../../application/use-cases/ListNotes'
import type { CreateNote } from '../../application/use-cases/CreateNote'
import type { CreateFolder } from '../../application/use-cases/CreateFolder'
import type { RenameEntry } from '../../application/use-cases/RenameEntry'
import type { DeleteEntry } from '../../application/use-cases/DeleteEntry'
import type { ReadNote } from '../../application/use-cases/ReadNote'
import type { FileWatcher } from '../../domain/interfaces/FileWatcher'
import type { SetLastVault } from '../../../state'
import type { VaultDto, NoteEntryDto, CreatedNoteDto, RenamedEntryDto } from '../../application/dto'

export class VaultIpcHandler {
  constructor(
    private readonly ipcMain: IpcMain,
    private readonly openVault: OpenVault,
    private readonly getCurrentVault: GetCurrentVault,
    private readonly listNotes: ListNotes,
    private readonly createNote: CreateNote,
    private readonly createFolder: CreateFolder,
    private readonly renameEntry: RenameEntry,
    private readonly deleteEntry: DeleteEntry,
    private readonly readNote: ReadNote,
    private readonly fileWatcher: FileWatcher,
    private readonly getMainWindow: () => BrowserWindow | null,
    private readonly setLastVault: SetLastVault
  ) {}

  private startWatcher(rootPath: string): void {
    this.fileWatcher.start(rootPath, (batch) => {
      const win = this.getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('vault:note-changed', batch.map(e => ({ type: e.type, path: e.path })))
      }
    })
  }

  register(): void {
    this.ipcMain.on('vault:open-vault', async (event, payload: { reqId: string }) => {
      const { reqId } = payload
      try {
        const win = BrowserWindow.fromWebContents(event.sender)
        const result = await dialog.showOpenDialog(win!, {
          properties: ['openDirectory']
        })

        if (result.canceled || result.filePaths.length === 0) {
          event.reply('kolly:reply', { reqId, data: null })
          return
        }

        const dto: VaultDto = this.openVault.execute(result.filePaths[0])
        this.setLastVault.execute(dto.rootPath)
        this.startWatcher(dto.rootPath)

        event.reply('kolly:reply', { reqId, data: dto })
      } catch (e) {
        await dialog.showMessageBox({
          type: 'error',
          message: (e as Error).message
        })
        event.reply('kolly:reply', { reqId, error: true })
      }
    })

    this.ipcMain.on('vault:get-current-vault', (event, payload: { reqId: string }) => {
      const { reqId } = payload
      try {
        const dto = this.getCurrentVault.execute()
        event.reply('kolly:reply', { reqId, data: dto })
      } catch (e) {
        dialog.showMessageBox({
          type: 'error',
          message: (e as Error).message
        })
        event.reply('kolly:reply', { reqId, error: true })
      }
    })

    this.ipcMain.on('vault:list-notes', (event, payload: { reqId: string }) => {
      const { reqId } = payload
      try {
        const dto: NoteEntryDto[] = this.listNotes.execute()
        if (!this.fileWatcher.isRunning()) {
          const vault = this.getCurrentVault.execute()
          if (vault) this.startWatcher(vault.rootPath)
        }
        event.reply('kolly:reply', { reqId, data: dto })
      } catch (e) {
        dialog.showMessageBox({
          type: 'error',
          message: (e as Error).message
        })
        event.reply('kolly:reply', { reqId, error: true })
      }
    })

    this.ipcMain.on(
      'vault:create-note',
      (event, payload: { reqId: string; args: [string, string, string] }) => {
        const { reqId, args } = payload
        const [folderPath, baseName, content] = args
        try {
          const dto: CreatedNoteDto = this.createNote.execute(folderPath, baseName, content)
          event.reply('kolly:reply', { reqId, data: dto })
        } catch (e) {
          dialog.showMessageBox({
            type: 'error',
            message: (e as Error).message
          })
          event.reply('kolly:reply', { reqId, error: true })
        }
      }
    )

    this.ipcMain.on(
      'vault:context-menu',
      (event, payload: { reqId: string; args: [string, string] }) => {
        const { reqId } = payload
        try {
          const win = BrowserWindow.fromWebContents(event.sender)
          const kind = payload.args[1] as 'root' | 'folder' | 'file'
          const items: Electron.MenuItemConstructorOptions[] = []
          if (kind === 'root' || kind === 'folder') {
            items.push(
              {
                label: 'New File',
                click: () => event.reply('kolly:reply', { reqId, data: { action: 'new-file' } })
              },
              {
                label: 'New Folder',
                click: () => event.reply('kolly:reply', { reqId, data: { action: 'new-folder' } })
              }
            )
          }
          if (kind === 'folder' || kind === 'file') {
            if (items.length > 0) {
              items.push({ type: 'separator' })
            }
            items.push(
              {
                label: 'Rename',
                click: () => event.reply('kolly:reply', { reqId, data: { action: 'rename' } })
              },
              { type: 'separator' },
              {
                label: 'Delete',
                click: () => event.reply('kolly:reply', { reqId, data: { action: 'delete' } })
              }
            )
          }
          const menu = Menu.buildFromTemplate(items)
          menu.popup({ window: win! })
        } catch (e) {
          event.reply('kolly:reply', { reqId, data: null })
        }
      }
    )

    this.ipcMain.on(
      'vault:create-folder',
      (event, payload: { reqId: string; args: [string, string] }) => {
        const { reqId, args } = payload
        const [folderPath, baseName] = args
        try {
          const dto: CreatedNoteDto = this.createFolder.execute(folderPath, baseName)
          event.reply('kolly:reply', { reqId, data: dto })
        } catch (e) {
          dialog.showMessageBox({
            type: 'error',
            message: (e as Error).message
          })
          event.reply('kolly:reply', { reqId, error: true })
        }
      }
    )

    this.ipcMain.on(
      'vault:rename-entry',
      (event, payload: { reqId: string; args: [string, string] }) => {
        const { reqId, args } = payload
        const [oldPath, newName] = args
        try {
          const dto: RenamedEntryDto = this.renameEntry.execute(oldPath, newName)
          event.reply('kolly:reply', { reqId, data: dto })
        } catch (e) {
          dialog.showMessageBox({
            type: 'error',
            message: (e as Error).message
          })
          event.reply('kolly:reply', { reqId, error: true })
        }
      }
    )

    this.ipcMain.on(
      'vault:delete-entry',
      (event, payload: { reqId: string; args: [string] }) => {
        const { reqId, args } = payload
        const [entryPath] = args
        try {
          this.deleteEntry.execute(entryPath)
          event.reply('kolly:reply', { reqId, data: null })
        } catch (e) {
          dialog.showMessageBox({
            type: 'error',
            message: (e as Error).message
          })
          event.reply('kolly:reply', { reqId, error: true })
        }
      }
    )

    this.ipcMain.on(
      'vault:read-note',
      (event, payload: { reqId: string; args: [string] }) => {
        const { reqId, args } = payload
        const [filePath] = args
        try {
          const content = this.readNote.execute(filePath)
          event.reply('kolly:reply', { reqId, data: content })
        } catch (e) {
          event.reply('kolly:reply', { reqId, error: true })
        }
      }
    )
  }
}

import { IpcMain, dialog, BrowserWindow } from 'electron'
import type { OpenVault } from '../../application/use-cases/OpenVault'
import type { GetCurrentVault } from '../../application/use-cases/GetCurrentVault'
import type { ListNotes } from '../../application/use-cases/ListNotes'
import type { CreateNote } from '../../application/use-cases/CreateNote'
import type { SetLastVault } from '../../../state'
import type { VaultDto, NoteEntryDto, CreatedNoteDto } from '../../application/dto'

export class VaultIpcHandler {
  constructor(
    private readonly ipcMain: IpcMain,
    private readonly openVault: OpenVault,
    private readonly getCurrentVault: GetCurrentVault,
    private readonly listNotes: ListNotes,
    private readonly createNote: CreateNote,
    private readonly setLastVault: SetLastVault
  ) {}

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
  }
}

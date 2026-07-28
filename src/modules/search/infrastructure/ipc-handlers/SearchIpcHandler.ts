import { IpcMain, dialog } from 'electron'
import type { SearchNotes } from '../../application/use-cases/SearchNotes'
import type { SearchResultDto } from '../../application/dto'

export class SearchIpcHandler {
  constructor(
    private readonly ipcMain: IpcMain,
    private readonly searchNotes: SearchNotes
  ) {}

  register(): void {
    this.ipcMain.on(
      'search:search-notes',
      (event, payload: { reqId: string; args: [string] }) => {
        const { reqId, args } = payload
        const [query] = args
        try {
          const dto: SearchResultDto[] = this.searchNotes.execute(query)
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

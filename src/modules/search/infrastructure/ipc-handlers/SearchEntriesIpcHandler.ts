import { IpcMain, dialog } from 'electron'
import type { SearchEntries } from '../../application/use-cases/SearchEntries'
import type { SearchEntryDto } from '../../application/dto'

export class SearchEntriesIpcHandler {
  constructor(
    private readonly ipcMain: IpcMain,
    private readonly searchEntries: SearchEntries
  ) {}

  register(): void {
    this.ipcMain.on(
      'search:search-entries',
      (event, payload: { reqId: string; args: [string] }) => {
        const { reqId, args } = payload
        const [query] = args
        try {
          const dto: SearchEntryDto[] = this.searchEntries.execute({ query })
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

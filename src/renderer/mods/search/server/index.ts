import type { IpcMain } from 'electron'
import type { VaultRepository, NoteRepository } from '../../../../modules/vault'
import { SearchNotes } from './application/use-cases/SearchNotes'
import { SearchEntries } from './application/use-cases/SearchEntries'
import { SearchIpcHandler } from './infrastructure/ipc-handlers/SearchIpcHandler'
import { SearchEntriesIpcHandler } from './infrastructure/ipc-handlers/SearchEntriesIpcHandler'

export { SearchResult } from './domain/entities/SearchResult'
export { SearchEntry } from './domain/entities/SearchEntry'
export type { SearchResultDto, SearchEntryDto } from './application/dto'
export { SearchNotes, SearchEntries, SearchIpcHandler, SearchEntriesIpcHandler }

export function register(deps: {
  ipcMain: IpcMain
  vaultRepo: VaultRepository
  noteRepo: NoteRepository
}): void {
  const searchNotes = new SearchNotes(deps.vaultRepo, deps.noteRepo)
  const searchEntries = new SearchEntries(deps.vaultRepo, deps.noteRepo)
  new SearchIpcHandler(deps.ipcMain, searchNotes).register()
  new SearchEntriesIpcHandler(deps.ipcMain, searchEntries).register()
}

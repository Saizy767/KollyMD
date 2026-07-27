import type { IpcMain } from 'electron'
import {
  InMemoryVaultRepository,
  FsNoteRepository,
  OpenVault,
  GetCurrentVault,
  ListNotes,
  CreateNote,
  VaultIpcHandler,
  Vault
} from './modules/vault'
import {
  InMemoryDocumentRepository,
  OpenDocument,
  SaveDocument,
  SaveAsDocument,
  NewDocument,
  MarkDirty,
  EditorIpcHandler
} from './modules/editor'
import { JsonStateRepository, GetLastVault, SetLastVault } from './modules/state'

export function bootstrap(ipcMain: IpcMain): void {
  const stateRepo = new JsonStateRepository()
  const getLastVault = new GetLastVault(stateRepo)
  const setLastVault = new SetLastVault(stateRepo)

  const vaultRepo = new InMemoryVaultRepository()
  const noteRepo = new FsNoteRepository()
  const openVault = new OpenVault(vaultRepo)
  const getCurrentVault = new GetCurrentVault(vaultRepo)
  const listNotes = new ListNotes(vaultRepo, noteRepo)
  const createNote = new CreateNote(vaultRepo, noteRepo)

  const docRepo = new InMemoryDocumentRepository()
  const openDocument = new OpenDocument(docRepo, noteRepo)
  const saveDocument = new SaveDocument(docRepo, noteRepo)
  const saveAsDocument = new SaveAsDocument(docRepo, noteRepo)
  const newDocument = new NewDocument(docRepo)
  const markDirty = new MarkDirty(docRepo)

  const lastVaultPath = getLastVault.execute()
  if (lastVaultPath) {
    vaultRepo.setCurrent(new Vault(lastVaultPath))
  }

  const vaultIpc = new VaultIpcHandler(
    ipcMain,
    openVault,
    getCurrentVault,
    listNotes,
    createNote,
    setLastVault
  )
  vaultIpc.register()

  const editorIpc = new EditorIpcHandler(
    ipcMain,
    openDocument,
    saveDocument,
    saveAsDocument,
    newDocument,
    markDirty,
    getCurrentVault
  )
  editorIpc.register()
}

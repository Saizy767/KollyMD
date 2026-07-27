import type { IpcMain } from 'electron'
import {
  InMemoryVaultRepository,
  FsNoteRepository,
  OpenVault,
  GetCurrentVault,
  ListNotes,
  VaultIpcHandler,
  Vault
} from './modules/vault'
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

  const lastVaultPath = getLastVault.execute()
  if (lastVaultPath) {
    vaultRepo.setCurrent(new Vault(lastVaultPath))
  }

  const vaultIpc = new VaultIpcHandler(
    ipcMain,
    openVault,
    getCurrentVault,
    listNotes,
    setLastVault
  )
  vaultIpc.register()
}

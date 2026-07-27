import type { IpcMain } from 'electron'
import {
  InMemoryVaultRepository,
  OpenVault,
  GetCurrentVault,
  VaultIpcHandler,
  Vault
} from './modules/vault'
import { JsonStateRepository, GetLastVault, SetLastVault } from './modules/state'

export function bootstrap(ipcMain: IpcMain): void {
  const stateRepo = new JsonStateRepository()
  const getLastVault = new GetLastVault(stateRepo)
  const setLastVault = new SetLastVault(stateRepo)

  const vaultRepo = new InMemoryVaultRepository()
  const openVault = new OpenVault(vaultRepo)
  const getCurrentVault = new GetCurrentVault(vaultRepo)

  const lastVaultPath = getLastVault.execute()
  if (lastVaultPath) {
    vaultRepo.setCurrent(new Vault(lastVaultPath))
  }

  const vaultIpc = new VaultIpcHandler(ipcMain, openVault, getCurrentVault, setLastVault)
  vaultIpc.register()
}

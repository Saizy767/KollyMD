import { Vault } from '../entities/Vault'

export interface VaultRepository {
  getCurrent(): Vault | null
  setCurrent(vault: Vault): void
}

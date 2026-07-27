import type { VaultRepository } from '../../domain/interfaces/VaultRepository'
import { Vault } from '../../domain/entities/Vault'

export class InMemoryVaultRepository implements VaultRepository {
  private vault: Vault | null = null

  getCurrent(): Vault | null {
    return this.vault
  }

  setCurrent(vault: Vault): void {
    this.vault = vault
  }
}

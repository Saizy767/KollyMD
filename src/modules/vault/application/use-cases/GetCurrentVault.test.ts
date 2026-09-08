import { describe, it, expect } from 'vitest'
import { GetCurrentVault } from './GetCurrentVault'
import { Vault, VaultRepository } from '../..'

class FakeVaultRepo implements VaultRepository {
  private vault: Vault | null = null
  getCurrent(): Vault | null { return this.vault }
  setCurrent(v: Vault): void { this.vault = v }
}

describe('GetCurrentVault', () => {
  it('returns null when no vault set', () => {
    const uc = new GetCurrentVault(new FakeVaultRepo())
    expect(uc.execute()).toBeNull()
  })

  it('returns DTO with rootPath when vault set', () => {
    const repo = new FakeVaultRepo()
    repo.setCurrent(new Vault('/my/vault'))
    const uc = new GetCurrentVault(repo)
    expect(uc.execute()).toEqual({ rootPath: '/my/vault' })
  })
})

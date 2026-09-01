import { describe, it, expect } from 'vitest'
import { OpenVault } from './OpenVault'
import { Vault, VaultRepository, InvalidVaultPathError } from '../..'

class FakeVaultRepo implements VaultRepository {
  setVault: Vault | null = null
  getCurrent(): Vault | null { return this.setVault }
  setCurrent(v: Vault): void { this.setVault = v }
}

describe('OpenVault', () => {
  it('throws InvalidVaultPathError for empty path', () => {
    const repo = new FakeVaultRepo()
    const open = new OpenVault(repo)
    expect(() => open.execute('')).toThrow(InvalidVaultPathError)
  })

  it('throws InvalidVaultPathError for whitespace path', () => {
    const repo = new FakeVaultRepo()
    const open = new OpenVault(repo)
    expect(() => open.execute('   ')).toThrow(InvalidVaultPathError)
  })

  it('sets vault and returns DTO for valid path', () => {
    const repo = new FakeVaultRepo()
    const open = new OpenVault(repo)
    const dto = open.execute('/my/vault')
    expect(dto.rootPath).toBe('/my/vault')
    expect(repo.setVault?.rootPath).toBe('/my/vault')
  })
})

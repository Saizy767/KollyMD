import type { VaultRepository } from '../../domain/interfaces/VaultRepository'
import { Vault } from '../../domain/entities/Vault'
import { InvalidVaultPathError } from '../../domain/errors/VaultErrors'
import type { VaultDto } from '../dto'

export class OpenVault {
  constructor(private readonly repo: VaultRepository) {}

  execute(rootPath: string): VaultDto {
    if (!rootPath || rootPath.trim().length === 0) {
      throw new InvalidVaultPathError(rootPath)
    }

    const vault = new Vault(rootPath)
    this.repo.setCurrent(vault)

    return { rootPath: vault.rootPath }
  }
}

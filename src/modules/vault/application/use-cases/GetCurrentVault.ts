import type { VaultRepository } from '../../domain/interfaces/VaultRepository'
import type { VaultDto } from '../dto'

export class GetCurrentVault {
  constructor(private readonly repo: VaultRepository) {}

  execute(): VaultDto | null {
    const vault = this.repo.getCurrent()
    return vault ? { rootPath: vault.rootPath } : null
  }
}

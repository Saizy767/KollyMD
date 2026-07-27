import type { StateRepository } from '../../domain/interfaces/StateRepository'

export class GetLastVault {
  constructor(private readonly repo: StateRepository) {}

  execute(): string | null {
    return this.repo.load().lastVaultPath
  }
}

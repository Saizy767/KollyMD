import type { StateRepository } from '../../domain/interfaces/StateRepository'

export class SetLastVault {
  constructor(private readonly repo: StateRepository) {}

  execute(path: string): void {
    const state = this.repo.load()
    state.lastVaultPath = path
    this.repo.save(state)
  }
}

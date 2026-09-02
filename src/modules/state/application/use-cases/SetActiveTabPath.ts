import type { StateRepository } from '../../domain/interfaces/StateRepository'

export class SetActiveTabPath {
  constructor(private readonly repo: StateRepository) {}

  execute(path: string | null): void {
    const state = this.repo.load()
    state.activeTabPath = path
    this.repo.save(state)
  }
}

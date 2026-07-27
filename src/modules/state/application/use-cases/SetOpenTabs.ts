import type { StateRepository } from '../../domain/interfaces/StateRepository'

export class SetOpenTabs {
  constructor(private readonly repo: StateRepository) {}

  execute(paths: string[]): void {
    const state = this.repo.load()
    state.openTabs = paths
    this.repo.save(state)
  }
}

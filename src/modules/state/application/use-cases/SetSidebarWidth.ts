import type { StateRepository } from '../../domain/interfaces/StateRepository'

export class SetSidebarWidth {
  constructor(private readonly repo: StateRepository) {}

  execute(width: number): void {
    const state = this.repo.load()
    state.sidebarWidth = width
    this.repo.save(state)
  }
}

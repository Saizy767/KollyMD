import type { StateRepository } from '../../domain/interfaces/StateRepository'

export class SetActivePanel {
  constructor(private readonly repo: StateRepository) {}

  execute(panel: string | null): void {
    const state = this.repo.load()
    state.activePanel = panel
    this.repo.save(state)
  }
}

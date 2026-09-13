import type { StateRepository } from '@state/domain/interfaces/StateRepository'

export class SetCommandBarButtons {
  constructor(private readonly repo: StateRepository) {}

  execute(buttonIds: string[]): void {
    const state = this.repo.load()
    state.commandBarButtons = buttonIds
    this.repo.save(state)
  }
}

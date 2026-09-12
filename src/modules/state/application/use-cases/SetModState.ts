import type { StateRepository } from '../../domain/interfaces/StateRepository'

export class SetModState {
  constructor(private readonly repo: StateRepository) {}

  execute(modId: string, data: unknown): void {
    const state = this.repo.load()
    state.modState[modId] = data
    this.repo.save(state)
  }
}

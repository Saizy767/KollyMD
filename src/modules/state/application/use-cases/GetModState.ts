import type { StateRepository } from '../../domain/interfaces/StateRepository'

export class GetModState {
  constructor(private readonly repo: StateRepository) {}

  execute(modId: string): unknown {
    return this.repo.load().modState[modId] ?? null
  }
}

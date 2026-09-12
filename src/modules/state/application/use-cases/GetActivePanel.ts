import type { StateRepository } from '../../domain/interfaces/StateRepository'

export class GetActivePanel {
  constructor(private readonly repo: StateRepository) {}

  execute(): string | null {
    return this.repo.load().activePanel
  }
}

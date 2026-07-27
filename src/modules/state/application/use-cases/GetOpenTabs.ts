import type { StateRepository } from '../../domain/interfaces/StateRepository'

export class GetOpenTabs {
  constructor(private readonly repo: StateRepository) {}

  execute(): string[] {
    return this.repo.load().openTabs
  }
}

import type { StateRepository } from '../../domain/interfaces/StateRepository'

export class GetActiveTabPath {
  constructor(private readonly repo: StateRepository) {}

  execute(): string | null {
    return this.repo.load().activeTabPath
  }
}

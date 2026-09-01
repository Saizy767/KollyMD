import type { StateRepository } from '../../domain/interfaces/StateRepository'

export class GetSidebarWidth {
  constructor(private readonly repo: StateRepository) {}

  execute(): number | null {
    return this.repo.load().sidebarWidth
  }
}

import type { StateRepository } from '../../domain/interfaces/StateRepository'

export class GetExpandedFolders {
  constructor(private readonly repo: StateRepository) {}

  execute(): string[] {
    return this.repo.load().expandedFolders
  }
}

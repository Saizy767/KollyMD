import type { StateRepository } from '../../domain/interfaces/StateRepository'

export class SetExpandedFolders {
  constructor(private readonly repo: StateRepository) {}

  execute(folders: string[]): void {
    const state = this.repo.load()
    state.expandedFolders = folders
    this.repo.save(state)
  }
}

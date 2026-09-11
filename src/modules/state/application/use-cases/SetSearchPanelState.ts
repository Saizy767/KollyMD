import type { StateRepository } from '../../domain/interfaces/StateRepository'
import type { SearchPanelStateDto } from './GetSearchPanelState'

export class SetSearchPanelState {
  constructor(private readonly repo: StateRepository) {}

  execute(dto: SearchPanelStateDto): void {
    const state = this.repo.load()
    state.activePanel = dto.activePanel
    state.expandedSearchFolders = dto.expandedSearchFolders
    state.lastSearchQuery = dto.lastSearchQuery
    this.repo.save(state)
  }
}

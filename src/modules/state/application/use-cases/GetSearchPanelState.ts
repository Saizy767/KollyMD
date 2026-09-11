import type { StateRepository } from '../../domain/interfaces/StateRepository'

export interface SearchPanelStateDto {
  activePanel: 'explorer' | 'search'
  expandedSearchFolders: string[]
  lastSearchQuery: string
}

export class GetSearchPanelState {
  constructor(private readonly repo: StateRepository) {}

  execute(): SearchPanelStateDto {
    const state = this.repo.load()
    return {
      activePanel: state.activePanel,
      expandedSearchFolders: state.expandedSearchFolders,
      lastSearchQuery: state.lastSearchQuery
    }
  }
}

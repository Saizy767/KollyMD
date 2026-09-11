export type SearchPanel = 'explorer' | 'search'

export class WorkspaceState {
  constructor(
    public lastVaultPath: string | null = null,
    public recentFiles: string[] = [],
    public openTabs: string[] = [],
    public sidebarWidth: number | null = null,
    public activeTabPath: string | null = null,
    public expandedFolders: string[] = [],
    public commandBarButtons: string[] = [],
    public activePanel: SearchPanel = 'explorer',
    public expandedSearchFolders: string[] = [],
    public lastSearchQuery: string = ''
  ) {}
}

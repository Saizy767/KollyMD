export class WorkspaceState {
  constructor(
    public lastVaultPath: string | null = null,
    public recentFiles: string[] = [],
    public openTabs: string[] = [],
    public sidebarWidth: number | null = null,
    public activeTabPath: string | null = null,
    public expandedFolders: string[] = []
  ) {}
}

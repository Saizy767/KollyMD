export class WorkspaceState {
  constructor(
    public lastVaultPath: string | null = null,
    public recentFiles: string[] = [],
    public openTabs: string[] = []
  ) {}
}

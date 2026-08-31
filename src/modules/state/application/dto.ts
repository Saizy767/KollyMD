// === Application DTOs: state module ===
// Data Transfer Objects exchanged between renderer and main process for state operations.
export interface WorkspaceStateDto {
  lastVaultPath: string | null
  recentFiles: string[]
  openTabs: string[]
}
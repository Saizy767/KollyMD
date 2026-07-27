interface VaultDto {
  rootPath: string
}

interface NoteEntryDto {
  path: string
  name: string
  isDirectory: boolean
  children: NoteEntryDto[]
}

interface VaultApi {
  openVault: () => Promise<VaultDto | null>
  getCurrentVault: () => Promise<VaultDto | null>
  listNotes: () => Promise<NoteEntryDto[]>
  createNote: (folderPath: string, baseName: string, content: string) => Promise<{ path: string }>
}

interface Window {
  api: {
    vault: VaultApi
  }
}

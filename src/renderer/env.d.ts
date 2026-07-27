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
}

interface Window {
  api: {
    vault: VaultApi
  }
}

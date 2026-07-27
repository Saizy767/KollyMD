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

interface OpenDocumentDto {
  path: string
  content: string
}

interface SavedDocumentDto {
  path: string
}

interface EditorApi {
  openDocument: (filePath: string) => Promise<OpenDocumentDto>
  saveDocument: (content: string) => Promise<void>
  saveAsDocument: (content: string) => Promise<SavedDocumentDto | null>
  newDocument: () => Promise<void>
  markDirty: (dirty: boolean) => Promise<void>
}

interface KollyError extends Error {
  code?: string
}

interface Window {
  api: {
    vault: VaultApi
    editor: EditorApi
  }
}

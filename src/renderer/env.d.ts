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
  docId: string
  path: string
  content: string
  alreadyOpen: boolean
}

interface SavedDocumentDto {
  path: string
}

interface NewDocumentDto {
  docId: string
}

interface CloseDocumentDto {
  newActiveId: string | null
}

interface TabDto {
  id: string
  path: string | null
  dirty: boolean
}

interface OpenTabsDto {
  tabs: TabDto[]
  activeId: string | null
}

interface EditorApi {
  openDocument: (filePath: string) => Promise<OpenDocumentDto>
  saveDocument: (content: string) => Promise<void>
  saveAsDocument: (content: string) => Promise<SavedDocumentDto | null>
  newDocument: () => Promise<NewDocumentDto>
  markDirty: (docId: string, dirty: boolean) => Promise<void>
  closeDocument: (docId: string) => Promise<CloseDocumentDto>
  switchDocument: (docId: string) => Promise<void>
  getOpenDocuments: () => Promise<OpenTabsDto>
  getOpenTabs: () => Promise<string[]>
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

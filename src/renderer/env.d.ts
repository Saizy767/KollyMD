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
  createFolder: (folderPath: string, baseName: string) => Promise<{ path: string }>
  contextMenu: (entryPath: string, kind: 'root' | 'folder' | 'file') => Promise<{ action: string } | null>
  renameEntry: (oldPath: string, newName: string) => Promise<{ path: string }>
  deleteEntry: (entryPath: string) => Promise<void>
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

interface BacklinkDto {
  sourcePath: string
  sourceName: string
}

interface NoteRefDto {
  path: string
  name: string
}

interface KnowledgeApi {
  findBacklinks: (noteName: string) => Promise<BacklinkDto[]>
  findNotesByTag: (tag: string) => Promise<NoteRefDto[]>
  resolveLink: (noteName: string) => Promise<{ path: string } | null>
  createNoteFromLink: (noteName: string) => Promise<{ path: string }>
}

interface SearchResultDto {
  path: string
  name: string
  snippet: string
  matchCount: number
}

interface SearchApi {
  searchNotes: (query: string) => Promise<SearchResultDto[]>
}

interface Window {
  api: {
    vault: VaultApi
    editor: EditorApi
    knowledge: KnowledgeApi
    search: SearchApi
  }
}

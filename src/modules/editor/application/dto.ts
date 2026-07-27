export interface OpenDocumentDto {
  docId: string
  path: string
  content: string
  alreadyOpen: boolean
}

export interface SavedDocumentDto {
  path: string
}

export interface NewDocumentDto {
  docId: string
}

export interface CloseDocumentDto {
  newActiveId: string | null
}

export interface TabDto {
  id: string
  path: string | null
  dirty: boolean
}

export interface OpenTabsDto {
  tabs: TabDto[]
  activeId: string | null
}

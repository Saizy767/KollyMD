export interface VaultDto {
  rootPath: string
}

export interface NoteEntryDto {
  path: string
  name: string
  isDirectory: boolean
  children: NoteEntryDto[]
}

export interface CreatedNoteDto {
  path: string
}

export interface NoteContentDto {
  path: string
  content: string
}

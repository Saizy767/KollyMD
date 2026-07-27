export interface VaultDto {
  rootPath: string
}

export interface NoteEntryDto {
  path: string
  name: string
  isDirectory: boolean
  children: NoteEntryDto[]
}

import { NoteEntry } from '../entities/NoteEntry'

export interface NoteContent {
  path: string
  content: string
}

export interface NoteRepository {
  listEntries(rootPath: string): NoteEntry[]
  createNote(folderPath: string, baseName: string, content: string): string
  readNote(filePath: string): string
  writeNote(filePath: string, content: string): void
  findByNoteName(vaultRoot: string, name: string): string | null
  readAllNotes(vaultRoot: string): NoteContent[]
}

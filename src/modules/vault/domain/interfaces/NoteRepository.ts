import { NoteEntry } from '../entities/NoteEntry'

export interface NoteRepository {
  listEntries(rootPath: string): NoteEntry[]
  createNote(folderPath: string, baseName: string, content: string): string
}

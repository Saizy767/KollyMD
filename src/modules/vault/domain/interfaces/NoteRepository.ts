import { NoteEntry } from '../entities/NoteEntry'

export interface NoteRepository {
  listEntries(rootPath: string): NoteEntry[]
}

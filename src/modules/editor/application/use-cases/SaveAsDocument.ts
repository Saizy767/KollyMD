import type { DocumentRepository } from '../../domain/interfaces/DocumentRepository'
import type { NoteRepository } from '../../../vault'
import type { SavedDocumentDto } from '../dto'

export class SaveAsDocument {
  constructor(
    private readonly docRepo: DocumentRepository,
    private readonly noteRepo: NoteRepository
  ) {}

  execute(newPath: string, content: string): SavedDocumentDto {
    this.noteRepo.writeNote(newPath, content)
    this.docRepo.setPath(newPath)
    this.docRepo.markDirty(false)
    return { path: newPath }
  }
}

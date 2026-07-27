import type { DocumentRepository } from '../../domain/interfaces/DocumentRepository'
import type { NoteRepository } from '../../../vault'
import { NoDocumentOpenError } from '../../domain/errors/EditorErrors'
import type { SavedDocumentDto } from '../dto'

export class SaveAsDocument {
  constructor(
    private readonly docRepo: DocumentRepository,
    private readonly noteRepo: NoteRepository
  ) {}

  execute(newPath: string, content: string): SavedDocumentDto {
    const doc = this.docRepo.getActiveDocument()
    if (!doc) {
      throw new NoDocumentOpenError()
    }
    this.noteRepo.writeNote(newPath, content)
    this.docRepo.setPath(doc.id, newPath)
    this.docRepo.markDirty(doc.id, false)
    return { path: newPath }
  }
}

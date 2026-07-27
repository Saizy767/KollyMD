import type { DocumentRepository } from '../../domain/interfaces/DocumentRepository'
import type { NoteRepository } from '../../../vault'
import { NoDocumentOpenError, DocumentHasNoPathError } from '../../domain/errors/EditorErrors'

export class SaveDocument {
  constructor(
    private readonly docRepo: DocumentRepository,
    private readonly noteRepo: NoteRepository
  ) {}

  execute(content: string): void {
    const doc = this.docRepo.getCurrent()
    if (!doc) {
      throw new NoDocumentOpenError()
    }
    if (!doc.path) {
      throw new DocumentHasNoPathError()
    }
    this.noteRepo.writeNote(doc.path, content)
    this.docRepo.markDirty(false)
  }
}

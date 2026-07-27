import type { DocumentRepository } from '../../domain/interfaces/DocumentRepository'
import type { NoteRepository } from '../../../vault'
import { Document } from '../../domain/entities/Document'
import type { OpenDocumentDto } from '../dto'

export class OpenDocument {
  constructor(
    private readonly docRepo: DocumentRepository,
    private readonly noteRepo: NoteRepository
  ) {}

  execute(filePath: string): OpenDocumentDto {
    const existing = this.docRepo.getOpenDocuments().find(d => d.path === filePath)
    if (existing) {
      this.docRepo.setActive(existing.id)
      const content = this.noteRepo.readNote(filePath)
      return { docId: existing.id, path: filePath, content, alreadyOpen: true }
    }

    const content = this.noteRepo.readNote(filePath)
    const doc = new Document(this.genId(), filePath, false)
    this.docRepo.openDocument(doc)
    return { docId: doc.id, path: filePath, content, alreadyOpen: false }
  }

  private genId(): string {
    return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

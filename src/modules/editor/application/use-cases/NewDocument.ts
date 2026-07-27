import type { DocumentRepository } from '../../domain/interfaces/DocumentRepository'
import { Document } from '../../domain/entities/Document'
import type { NewDocumentDto } from '../dto'

export class NewDocument {
  constructor(private readonly docRepo: DocumentRepository) {}

  execute(): NewDocumentDto {
    const doc = new Document(this.genId(), null, false)
    this.docRepo.openDocument(doc)
    return { docId: doc.id }
  }

  private genId(): string {
    return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

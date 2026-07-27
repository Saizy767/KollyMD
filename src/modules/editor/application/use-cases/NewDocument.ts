import type { DocumentRepository } from '../../domain/interfaces/DocumentRepository'
import { Document } from '../../domain/entities/Document'

export class NewDocument {
  constructor(private readonly docRepo: DocumentRepository) {}

  execute(): void {
    this.docRepo.setCurrent(new Document(this.genId(), null, false))
  }

  private genId(): string {
    return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

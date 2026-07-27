import type { DocumentRepository } from '../../domain/interfaces/DocumentRepository'
import { TabNotFoundError } from '../../domain/errors/EditorErrors'
import type { CloseDocumentDto } from '../dto'

export class CloseDocument {
  constructor(private readonly docRepo: DocumentRepository) {}

  execute(id: string): CloseDocumentDto {
    const doc = this.docRepo.getOpenDocuments().find(d => d.id === id)
    if (!doc) {
      throw new TabNotFoundError(id)
    }
    this.docRepo.closeDocument(id)
    const active = this.docRepo.getActiveDocument()
    return { newActiveId: active ? active.id : null }
  }
}

import type { DocumentRepository } from '../../domain/interfaces/DocumentRepository'

export class UpdateDocumentPath {
  constructor(private readonly docRepo: DocumentRepository) {}

  execute(docId: string, newPath: string): void {
    this.docRepo.setPath(docId, newPath)
  }
}

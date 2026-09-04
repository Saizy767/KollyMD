import type { DocumentRepository } from '../../domain/interfaces/DocumentRepository'

export class ReorderDocuments {
  constructor(private readonly docRepo: DocumentRepository) {}

  execute(ids: string[]): void {
    this.docRepo.reorder(ids)
  }
}

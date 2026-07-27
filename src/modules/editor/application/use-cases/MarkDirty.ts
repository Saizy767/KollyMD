import type { DocumentRepository } from '../../domain/interfaces/DocumentRepository'

export class MarkDirty {
  constructor(private readonly docRepo: DocumentRepository) {}

  execute(docId: string, dirty: boolean): void {
    this.docRepo.markDirty(docId, dirty)
  }
}

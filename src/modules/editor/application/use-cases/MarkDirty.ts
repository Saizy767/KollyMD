import type { DocumentRepository } from '../../domain/interfaces/DocumentRepository'

export class MarkDirty {
  constructor(private readonly docRepo: DocumentRepository) {}

  execute(dirty: boolean): void {
    this.docRepo.markDirty(dirty)
  }
}

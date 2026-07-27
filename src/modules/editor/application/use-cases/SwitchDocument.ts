import type { DocumentRepository } from '../../domain/interfaces/DocumentRepository'
import { TabNotFoundError } from '../../domain/errors/EditorErrors'

export class SwitchDocument {
  constructor(private readonly docRepo: DocumentRepository) {}

  execute(id: string): void {
    const doc = this.docRepo.getOpenDocuments().find(d => d.id === id)
    if (!doc) {
      throw new TabNotFoundError(id)
    }
    this.docRepo.setActive(id)
  }
}

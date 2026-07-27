import type { DocumentRepository } from '../../domain/interfaces/DocumentRepository'
import { Document } from '../../domain/entities/Document'

export class InMemoryDocumentRepository implements DocumentRepository {
  private doc: Document | null = null

  getCurrent(): Document | null {
    return this.doc
  }

  setCurrent(doc: Document): void {
    this.doc = doc
  }

  markDirty(dirty: boolean): void {
    if (this.doc) {
      this.doc = new Document(this.doc.id, this.doc.path, dirty)
    }
  }

  setPath(path: string): void {
    if (this.doc) {
      this.doc = new Document(this.doc.id, path, this.doc.dirty)
    }
  }
}

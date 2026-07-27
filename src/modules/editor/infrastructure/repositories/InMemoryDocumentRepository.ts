import type { DocumentRepository } from '../../domain/interfaces/DocumentRepository'
import { Document } from '../../domain/entities/Document'

export class InMemoryDocumentRepository implements DocumentRepository {
  private readonly docs = new Map<string, Document>()
  private readonly order: string[] = []
  private activeId: string | null = null

  getOpenDocuments(): Document[] {
    return this.order.map(id => this.docs.get(id)).filter((d): d is Document => d !== undefined)
  }

  getActiveDocument(): Document | null {
    if (!this.activeId) return null
    return this.docs.get(this.activeId) ?? null
  }

  openDocument(doc: Document): void {
    this.docs.set(doc.id, doc)
    this.order.push(doc.id)
    this.activeId = doc.id
  }

  closeDocument(id: string): void {
    this.docs.delete(id)
    const idx = this.order.indexOf(id)
    if (idx >= 0) this.order.splice(idx, 1)
    if (this.activeId === id) {
      this.activeId = this.order.length > 0 ? this.order[this.order.length - 1] : null
    }
  }

  setActive(id: string): void {
    this.activeId = id
  }

  markDirty(id: string, dirty: boolean): void {
    const doc = this.docs.get(id)
    if (doc) {
      this.docs.set(id, new Document(doc.id, doc.path, dirty))
    }
  }

  setPath(id: string, path: string): void {
    const doc = this.docs.get(id)
    if (doc) {
      this.docs.set(id, new Document(doc.id, path, doc.dirty))
    }
  }
}

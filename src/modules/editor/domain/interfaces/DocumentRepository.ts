import { Document } from '../entities/Document'

export interface DocumentRepository {
  getOpenDocuments(): Document[]
  getActiveDocument(): Document | null
  openDocument(doc: Document): void
  closeDocument(id: string): void
  setActive(id: string): void
  markDirty(id: string, dirty: boolean): void
  setPath(id: string, path: string): void
}

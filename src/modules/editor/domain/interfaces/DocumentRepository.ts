import { Document } from '../entities/Document'

export interface DocumentRepository {
  getCurrent(): Document | null
  setCurrent(doc: Document): void
  markDirty(dirty: boolean): void
  setPath(path: string): void
}

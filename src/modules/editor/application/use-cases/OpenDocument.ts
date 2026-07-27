import type { DocumentRepository } from '../../domain/interfaces/DocumentRepository'
import type { NoteRepository } from '../../../vault'
import { Document } from '../../domain/entities/Document'
import type { OpenDocumentDto } from '../dto'

export class OpenDocument {
  constructor(
    private readonly docRepo: DocumentRepository,
    private readonly noteRepo: NoteRepository
  ) {}

  execute(filePath: string): OpenDocumentDto {
    const content = this.noteRepo.readNote(filePath)
    this.docRepo.setCurrent(new Document(this.genId(), filePath, false))
    return { path: filePath, content }
  }

  private genId(): string {
    return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

import type { DocumentRepository } from '../../domain/interfaces/DocumentRepository'
import type { OpenTabsDto, TabDto } from '../dto'

export class GetOpenDocuments {
  constructor(private readonly docRepo: DocumentRepository) {}

  execute(): OpenTabsDto {
    const docs = this.docRepo.getOpenDocuments()
    const active = this.docRepo.getActiveDocument()
    const tabs: TabDto[] = docs.map(d => ({ id: d.id, path: d.path, dirty: d.dirty }))
    return { tabs, activeId: active ? active.id : null }
  }
}

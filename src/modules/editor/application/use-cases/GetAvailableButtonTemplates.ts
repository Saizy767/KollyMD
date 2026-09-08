import type { ButtonTemplateRepository } from '../../domain/interfaces/ButtonTemplateRepository'
import type { ButtonTemplateDto } from '../dto'

export class GetAvailableButtonTemplates {
  constructor(private readonly repo: ButtonTemplateRepository) {}

  execute(): { templates: ButtonTemplateDto[] } {
    const templates = this.repo.getAll()
    return {
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        iconPath: t.iconPath,
        action: t.action
      }))
    }
  }
}

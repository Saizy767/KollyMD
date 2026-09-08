import { ButtonTemplate } from '../../domain/entities/ButtonTemplate'
import type { ButtonTemplateRepository } from '../../domain/interfaces/ButtonTemplateRepository'

export class StaticButtonTemplateRepository implements ButtonTemplateRepository {
  private readonly templates: ButtonTemplate[] = [
    new ButtonTemplate(
      'search',
      'Поиск',
      'Глобальный поиск по заметкам',
      'assets/search-icon.svg',
      'open-search'
    ),
    new ButtonTemplate(
      'llm-dialog',
      'Диалог с LLM',
      'Общение с языковой моделью',
      'assets/llm-icon.svg',
      'open-llm-dialog'
    ),
    new ButtonTemplate(
      'cluster-tree',
      'Кластерное дерево',
      'Визуализация связей через кластеры',
      'assets/cluster-tree-icon.svg',
      'open-cluster-tree'
    ),
    new ButtonTemplate(
      'filesystem',
      'Файловая система',
      'Навигация по файлам и папкам',
      'assets/filesystem-icon.svg',
      'open-filesystem'
    )
  ]

  getAll(): ButtonTemplate[] {
    return this.templates
  }
}

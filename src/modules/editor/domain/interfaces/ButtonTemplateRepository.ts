import { ButtonTemplate } from '../entities/ButtonTemplate'

export interface ButtonTemplateRepository {
  getAll(): ButtonTemplate[]
}

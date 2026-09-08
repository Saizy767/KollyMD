import type { ButtonModule } from '../../../shared/domain/buttons/ButtonModule'
import { ButtonAlreadyRegisteredError, ButtonNotFoundError } from '../../../shared/domain/errors/ButtonError'

export class ButtonRegistry {
  private readonly modules = new Map<string, ButtonModule>()
  private activeModuleId: string | null = null

  register(module: ButtonModule): void {
    const id = module.manifest.id
    if (this.modules.has(id)) {
      throw new ButtonAlreadyRegisteredError(id)
    }
    this.modules.set(id, module)
    module.onRegister?.()
  }

  setActive(moduleId: string | null): void {
    if (moduleId === null) {
      if (this.activeModuleId !== null) {
        this.modules.get(this.activeModuleId)?.onDeactivate?.()
        this.activeModuleId = null
      }
      return
    }

    const next = this.modules.get(moduleId)
    if (!next) {
      throw new ButtonNotFoundError(moduleId)
    }
    if (moduleId === this.activeModuleId) return

    if (this.activeModuleId !== null) {
      this.modules.get(this.activeModuleId)?.onDeactivate?.()
    }
    next.onActivate?.()
    this.activeModuleId = moduleId
  }

  getRegisteredModules(): ButtonModule[] {
    return Array.from(this.modules.values()).sort(
      (a, b) => a.manifest.order - b.manifest.order
    )
  }

  getActiveModule(): ButtonModule | null {
    if (this.activeModuleId === null) return null
    return this.modules.get(this.activeModuleId) ?? null
  }
}

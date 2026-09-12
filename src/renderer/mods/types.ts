import type { ButtonModule } from '../../shared/domain/buttons/ButtonModule'

export type ModId = string

export type ModStatus = 'loaded' | 'failed'

export interface ModManifest {
  id: ModId
  name: string
  version?: string
  description?: string
  order?: number
}

export interface ModInstance {
  id: ModId
  manifest: ModManifest | null
  status: ModStatus
  error?: string
}

export interface ModRegistryApi {
  registerButton(module: ButtonModule): void
}

export interface ModContext {
  openFile: (filePath: string) => Promise<void>
  editorApi: import('../regions/editor').EditorApi
  tabsApi: import('../regions/tabs').TabsApi
}

export type ModInit = (registry: ModRegistryApi, context: ModContext) => void | Promise<void>

export interface ModEntry {
  init: ModInit
  manifest?: ModManifest
}

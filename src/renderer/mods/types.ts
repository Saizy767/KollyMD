export type ModId = string

export type ModStatus = 'loaded' | 'failed'

export interface ModManifest {
  id: ModId
  name: string
  version?: string
}

export interface ModInstance {
  id: ModId
  manifest: ModManifest | null
  status: ModStatus
  error?: string
}

export interface SidebarButtonRegistration {
  id: string
  iconUrl?: string
  onClick: () => void
  templateId?: string
}

export interface ModRegistryApi {
  registerSidebarButton(button: SidebarButtonRegistration): void
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

export interface ButtonModuleManifest {
  id: string
  label: string
  order: number
  iconPath?: string
}

export interface ButtonModule {
  manifest: ButtonModuleManifest
  onRegister?(): void
  onActivate?(): void
  onDeactivate?(): void
}

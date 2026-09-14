export class ModManifestError extends Error {
  readonly code = 'MOD_MANIFEST_ERROR'

  constructor(message: string) {
    super(message)
    this.name = 'ModManifestError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

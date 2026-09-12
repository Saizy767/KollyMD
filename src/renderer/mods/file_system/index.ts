import type { ModContext, ModManifest, ModRegistryApi } from '../types'
import { ModManifestError } from '../mod-manifest-error'
import { initExplorer } from './panel'
import manifestData from './manifest.json'
import iconUrl from './icon.svg'

const manifest: ModManifest = manifestData

function validate(): void {
  if (!manifest || typeof manifest.id !== 'string' || manifest.id.length === 0) {
    throw new ModManifestError('file_system: manifest.json missing required field "id"')
  }
  if (typeof manifest.name !== 'string' || manifest.name.length === 0) {
    throw new ModManifestError('file_system: manifest.json missing required field "name"')
  }
  if (typeof iconUrl !== 'string' || iconUrl.length === 0) {
    throw new ModManifestError('file_system: icon.svg missing or unresolved')
  }
}

export async function init(registry: ModRegistryApi, context: ModContext): Promise<void> {
  validate()
  const explorer = initExplorer(context, manifest.id)

  registry.registerButton({
    manifest: {
      id: manifest.id,
      label: manifest.name,
      order: manifest.order ?? 99,
      iconPath: iconUrl,
      description: manifest.description,
    },
    onActivate: () => explorer.showPanel(),
    onDeactivate: () => explorer.hidePanel(),
  })

  document.addEventListener('kollymd:file-tree-refresh', () => { void explorer.loadExplorer() })
  document.addEventListener('kollymd:active-highlight-refresh', () => explorer.refreshActiveHighlight())

  await explorer.loadCurrentVault()
  await explorer.restoreState()
}

export { manifest }

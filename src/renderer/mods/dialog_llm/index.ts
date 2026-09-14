import type { ModContext, ModManifest, ModRegistryApi } from '../types'
import { ModManifestError } from '../mod-manifest-error'
import { initLlmDialog } from './panel'
import manifestData from './manifest.json'
import iconUrl from './icon.svg'

const manifest: ModManifest = manifestData

function validate(): void {
  if (!manifest || typeof manifest.id !== 'string' || manifest.id.length === 0) {
    throw new ModManifestError('dialog_llm: manifest.json missing required field "id"')
  }
  if (typeof manifest.name !== 'string' || manifest.name.length === 0) {
    throw new ModManifestError('dialog_llm: manifest.json missing required field "name"')
  }
  if (typeof iconUrl !== 'string' || iconUrl.length === 0) {
    throw new ModManifestError('dialog_llm: icon.svg missing or unresolved')
  }
}

export async function init(registry: ModRegistryApi, _context: ModContext): Promise<void> {
  validate()
  const panel = initLlmDialog(manifest.id)

  registry.registerButton({
    manifest: {
      id: manifest.id,
      label: manifest.name,
      order: manifest.order ?? 99,
      iconPath: iconUrl,
      description: manifest.description,
    },
    onActivate: () => panel.showPanel(),
    onDeactivate: () => panel.hidePanel(),
  })

  await panel.restoreState()
}

export { manifest }

import type { ModContext, ModManifest, ModRegistryApi } from '../types'
import { ModManifestError } from '../mod-manifest-error'
import { initSearchPanel } from './panel'
import manifestData from './manifest.json'
import iconUrl from './icon.svg'

const SEARCH_OPEN_EVENT = 'kollymd:open-search'

const manifest: ModManifest = manifestData

function validate(): void {
  if (!manifest || typeof manifest.id !== 'string' || manifest.id.length === 0) {
    throw new ModManifestError('search: manifest.json missing required field "id"')
  }
  if (typeof manifest.name !== 'string' || manifest.name.length === 0) {
    throw new ModManifestError('search: manifest.json missing required field "name"')
  }
  if (typeof iconUrl !== 'string' || iconUrl.length === 0) {
    throw new ModManifestError('search: icon.svg missing or unresolved')
  }
}

export async function init(registry: ModRegistryApi, context: ModContext): Promise<void> {
  validate()
  const panel = initSearchPanel(context)

  registry.registerSidebarButton({
    id: manifest.id,
    iconUrl,
    templateId: 'search',
    onClick: () => panel.showPanel(),
  })

  document.addEventListener(SEARCH_OPEN_EVENT, () => panel.showPanel())

  await panel.restoreState()
}

export { manifest }

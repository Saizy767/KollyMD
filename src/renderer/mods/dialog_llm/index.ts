import type { ModContext, ModManifest, ModRegistryApi } from '../types'
import { ModManifestError } from '../mod-manifest-error'
import { initLlmDialog } from './panel'
import manifestData from './manifest.json'
import iconUrl from './icon.svg'

const LLM_DIALOG_OPEN_EVENT = 'kollymd:open-llm-dialog'

const manifest: ModManifest = manifestData

function validate(): void {
  if (!manifest || typeof manifest.id !== 'string' || manifest.id.length === 0) {
    throw new ModManifestError('dialog_llm* manifest.json missing required field "id"')
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
  const panel = initLlmDialog()

  registry.registerSidebarButton({
    id: manifest.id,
    iconUrl,
    templateId: 'llm-dialog',
    onClick: () => panel.showPanel(),
  })

  document.addEventListener(LLM_DIALOG_OPEN_EVENT, () => panel.showPanel())

  await panel.restoreState()
}

export { manifest }

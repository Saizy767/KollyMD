import type {
  ModContext,
  ModEntry,
  ModId,
  ModInstance,
  ModManifest,
  ModRegistryApi,
  SidebarButtonRegistration,
} from './types'

type ModEntryMap = Record<string, () => Promise<ModEntry>>

const globEntries = import.meta.glob<ModEntry>('./*/index.ts')

function deriveModId(globPath: string): ModId {
  const segments = globPath.split('/')
  return segments[segments.length - 2] ?? globPath
}

export class ModRegistry implements ModRegistryApi {
  private readonly mods = new Map<ModId, ModInstance>()
  private readonly sidebarButtons: SidebarButtonRegistration[] = []
  private readonly entries: ModEntryMap

  constructor(entries: ModEntryMap = globEntries) {
    this.entries = entries
  }

  getRegisteredMods(): Map<ModId, ModInstance> {
    return new Map(this.mods)
  }

  getSidebarButtons(): readonly SidebarButtonRegistration[] {
    return this.sidebarButtons
  }

  registerSidebarButton(button: SidebarButtonRegistration): void {
    this.sidebarButtons.push(button)
  }

  async loadAll(context: ModContext): Promise<void> {
    const paths = Object.keys(this.entries)
    for (const globPath of paths) {
      const id = deriveModId(globPath)
      try {
        const mod = await this.entries[globPath]()
        if (typeof mod?.init !== 'function') {
          throw new Error('Missing init export')
        }
        const manifest: ModManifest | null = mod.manifest ?? null
        await mod.init(this, context)
        this.mods.set(id, { id, manifest, status: 'loaded' })
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        console.error('[KollyMD] Mod failed to load: ' + id, e)
        this.mods.set(id, { id, manifest: null, status: 'failed', error: message })
      }
    }
  }
}

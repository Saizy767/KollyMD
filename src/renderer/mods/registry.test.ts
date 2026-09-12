import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ModRegistry } from './registry'
import type { ModContext, ModEntry, ModRegistryApi, SidebarButtonRegistration } from './types'

const mockContext: ModContext = {
  openFile: vi.fn(),
  editorApi: { getEditorContent: vi.fn(), setEditorContent: vi.fn(), loadBacklinks: vi.fn() },
  tabsApi: {
    activeTab: vi.fn(), getTabs: vi.fn(), activeFilePath: vi.fn(), renderTabs: vi.fn(),
    updateDocStatus: vi.fn(), loadActiveBuffer: vi.fn(), switchToDoc: vi.fn(),
    setDirty: vi.fn(), closeDoc: vi.fn(), openFile: vi.fn(), restoreTabs: vi.fn(),
  },
}

function makeEntry(
  init: (registry: ModRegistryApi, context: ModContext) => void | Promise<void>,
  manifest?: ModEntry['manifest'],
): () => Promise<ModEntry> {
  return async () => ({ init, manifest })
}

describe('ModRegistry', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loadAll with no entries returns empty map', async () => {
    const registry = new ModRegistry({})
    await registry.loadAll(mockContext)
    expect(registry.getRegisteredMods().size).toBe(0)
  })

  it('loadAll registers a successful mod as loaded', async () => {
    const init = vi.fn()
    const registry = new ModRegistry({
      './my-mod/index.ts': makeEntry(init, { id: 'my-mod', name: 'My Mod' }),
    })
    await registry.loadAll(mockContext)
    const mods = registry.getRegisteredMods()
    expect(mods.size).toBe(1)
    const mod = mods.get('my-mod')
    expect(mod?.status).toBe('loaded')
    expect(mod?.manifest).toEqual({ id: 'my-mod', name: 'My Mod' })
    expect(init).toHaveBeenCalledTimes(1)
  })

  it('loadAll marks a failing mod as failed and logs error', async () => {
    const init = (): void => { throw new Error('boom') }
    const registry = new ModRegistry({
      './bad-mod/index.ts': makeEntry(init),
    })
    await registry.loadAll(mockContext)
    const mod = registry.getRegisteredMods().get('bad-mod')
    expect(mod?.status).toBe('failed')
    expect(mod?.error).toBe('boom')
    expect(console.error).toHaveBeenCalledWith(
      '[KollyMD] Mod failed to load: bad-mod',
      expect.any(Error),
    )
  })

  it('loadAll continues loading after a mod fails', async () => {
    const goodInit = vi.fn()
    const registry = new ModRegistry({
      './bad-mod/index.ts': makeEntry(() => { throw new Error('boom') }),
      './good-mod/index.ts': makeEntry(goodInit, { id: 'good-mod', name: 'Good' }),
    })
    await registry.loadAll(mockContext)
    const mods = registry.getRegisteredMods()
    expect(mods.get('bad-mod')?.status).toBe('failed')
    expect(mods.get('good-mod')?.status).toBe('loaded')
    expect(goodInit).toHaveBeenCalledTimes(1)
  })

  it('loadAll handles async init that rejects', async () => {
    const init = async (): Promise<void> => { throw new Error('async boom') }
    const registry = new ModRegistry({
      './async-bad/index.ts': makeEntry(init),
    })
    await registry.loadAll(mockContext)
    const mod = registry.getRegisteredMods().get('async-bad')
    expect(mod?.status).toBe('failed')
    expect(mod?.error).toBe('async boom')
  })

  it('loadAll handles async init that resolves', async () => {
    const init = vi.fn(async (): Promise<void> => {})
    const registry = new ModRegistry({
      './async-good/index.ts': makeEntry(init),
    })
    await registry.loadAll(mockContext)
    const mod = registry.getRegisteredMods().get('async-good')
    expect(mod?.status).toBe('loaded')
    expect(init).toHaveBeenCalledTimes(1)
  })

  it('loadAll marks mod as failed when init export is missing', async () => {
    const registry = new ModRegistry({
      './no-init/index.ts': async () => ({}) as ModEntry,
    })
    await registry.loadAll(mockContext)
    const mod = registry.getRegisteredMods().get('no-init')
    expect(mod?.status).toBe('failed')
    expect(mod?.error).toBe('Missing init export')
  })

  it('registerSidebarButton stores the registration', () => {
    const registry = new ModRegistry({})
    const button: SidebarButtonRegistration = { id: 'test-btn', onClick: () => {} }
    registry.registerSidebarButton(button)
    expect(registry.getSidebarButtons()).toHaveLength(1)
    expect(registry.getSidebarButtons()[0].id).toBe('test-btn')
  })

  it('mod init receives the registry as ModRegistryApi', async () => {
    const init = vi.fn((registry: ModRegistryApi, _ctx: ModContext) => {
      registry.registerSidebarButton({ id: 'from-mod', onClick: () => {} })
    })
    const registry = new ModRegistry({
      './self-reg/index.ts': makeEntry(init),
    })
    await registry.loadAll(mockContext)
    expect(registry.getSidebarButtons()).toHaveLength(1)
    expect(registry.getSidebarButtons()[0].id).toBe('from-mod')
  })

  it('mod init receives the context', async () => {
    const init = vi.fn((_registry: ModRegistryApi, ctx: ModContext) => {
      void ctx.openFile('/test/path')
    })
    const registry = new ModRegistry({
      './ctx-mod/index.ts': makeEntry(init),
    })
    await registry.loadAll(mockContext)
    expect(init).toHaveBeenCalledTimes(1)
    expect(mockContext.openFile).toHaveBeenCalledWith('/test/path')
  })

  it('getRegisteredMods returns a copy', async () => {
    const registry = new ModRegistry({
      './my-mod/index.ts': makeEntry(() => {}),
    })
    await registry.loadAll(mockContext)
    const mods1 = registry.getRegisteredMods()
    mods1.set('external', { id: 'external', manifest: null, status: 'loaded' })
    const mods2 = registry.getRegisteredMods()
    expect(mods2.has('external')).toBe(false)
  })
})

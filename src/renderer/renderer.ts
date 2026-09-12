/// <reference path="./env.d.ts" />

import { initCommandBar } from './regions/command-bar'
import { initSidebar, renderModSidebarButtons } from './regions/sidebar'
import { initEditor } from './regions/editor'
import type { EditorApi } from './regions/editor'
import { initTabs } from './regions/tabs'
import type { TabsApi } from './regions/tabs'
import { ModRegistry } from './mods/registry'

initSidebar()

let tabsApi!: TabsApi

const editorApi: EditorApi = initEditor({
  getActiveTab: () => tabsApi.activeTab(),
  setDirty: (v) => tabsApi.setDirty(v),
  openFile: (p) => tabsApi.openFile(p),
  loadExplorer: async () => { document.dispatchEvent(new CustomEvent('kollymd:explorer-refresh')) },
})

tabsApi = initTabs({
  getEditorContent: editorApi.getEditorContent,
  setEditorContent: editorApi.setEditorContent,
  loadBacklinks: editorApi.loadBacklinks,
  refreshActiveHighlight: () => { document.dispatchEvent(new CustomEvent('kollymd:explorer-refresh-highlight')) },
})

initCommandBar()

tabsApi.updateDocStatus()

const modRegistry = new ModRegistry()
modRegistry.loadAll({ openFile: (p) => tabsApi.openFile(p), editorApi, tabsApi })
  .then(() => renderModSidebarButtons(modRegistry))
  .catch(() => {})

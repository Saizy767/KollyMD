/// <reference path="./env.d.ts" />

import { initCommandBar, renderCommandBarButtons } from './regions/command-bar'
import { initSidebar } from './regions/sidebar'
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
  refreshFileTree: async () => { document.dispatchEvent(new CustomEvent('kollymd:file-tree-refresh')) },
})

tabsApi = initTabs({
  getEditorContent: editorApi.getEditorContent,
  setEditorContent: editorApi.setEditorContent,
  loadBacklinks: editorApi.loadBacklinks,
  refreshActiveHighlight: () => { document.dispatchEvent(new CustomEvent('kollymd:active-highlight-refresh')) },
})

const modRegistry = new ModRegistry()

initCommandBar(modRegistry)

tabsApi.updateDocStatus()

modRegistry.loadAll({ openFile: (p) => tabsApi.openFile(p), editorApi, tabsApi })
  .then(() => renderCommandBarButtons(modRegistry))
  .catch(() => {})

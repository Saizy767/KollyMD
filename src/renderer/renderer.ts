/// <reference path="./env.d.ts" />

import { initCommandBar } from './regions/command-bar'
import { initSidebar } from './regions/sidebar'
import { initEditor } from './regions/editor'
import type { EditorApi } from './regions/editor'
import { initTabs } from './regions/tabs'
import type { TabsApi } from './regions/tabs'
import { initExplorer } from './regions/explorer'
import type { ExplorerApi } from './regions/explorer'
import { initSearchPanel } from './regions/search-panel'

initSidebar()

let tabsApi!: TabsApi
let explorerApi!: ExplorerApi

const editorApi: EditorApi = initEditor({
  getActiveTab: () => tabsApi.activeTab(),
  setDirty: (v) => tabsApi.setDirty(v),
  openFile: (p) => tabsApi.openFile(p),
  loadExplorer: () => explorerApi.loadExplorer(),
})

tabsApi = initTabs({
  getEditorContent: editorApi.getEditorContent,
  setEditorContent: editorApi.setEditorContent,
  loadBacklinks: editorApi.loadBacklinks,
  refreshActiveHighlight: () => explorerApi.refreshActiveHighlight(),
})

explorerApi = initExplorer({
  editorApi,
  tabsApi,
})

const searchPanelApi = initSearchPanel({ tabsApi })

initCommandBar({ searchPanelApi })

tabsApi.updateDocStatus()
explorerApi.loadCurrentVault()

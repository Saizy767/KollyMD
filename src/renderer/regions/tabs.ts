import { docName } from '../utils/path'
import { getActiveDocId, setActiveDocId } from '../state'

const tabsList = document.getElementById('tabs-list') as HTMLUListElement
const docStatus = document.getElementById('doc-status') as HTMLSpanElement

export interface TabState {
  path: string | null
  content: string
  dirty: boolean
  missing?: boolean
  missingName?: string
}

const tabs = new Map<string, TabState>()

interface TabsDeps {
  getEditorContent: () => string
  setEditorContent: (content: string) => void
  loadBacklinks: () => Promise<void>
  refreshActiveHighlight: () => void
}

let deps: TabsDeps

export function activeTab(): TabState | null {
  const id = getActiveDocId()
  if (!id) return null
  return tabs.get(id) ?? null
}

export function getTabs(): Map<string, TabState> {
  return tabs
}

export function activeFilePath(): string | null {
  const id = getActiveDocId()
  if (!id) return null
  return tabs.get(id)?.path ?? null
}

function updateDocStatus(): void {
  const tab = activeTab()
  if (!tab) {
    docStatus.textContent = 'No document'
    return
  }
  const prefix = tab.dirty ? '[unsaved] ' : ''
  docStatus.textContent = prefix + docName(tab.path)
}

function renderTabs(): void {
  tabsList.innerHTML = ''
  for (const [docId, tab] of tabs) {
    const li = document.createElement('li')
    li.dataset.docId = docId
    if (docId === getActiveDocId()) {
      li.dataset.active = 'true'
    }

    const label = document.createElement('span')
    const prefix = docId === getActiveDocId() ? '[Active] ' : ''
    const dirtyMark = tab.dirty ? '[unsaved] ' : ''
    const missingMark = tab.missing ? '[missing] ' : ''
    const name = tab.missing ? (tab.missingName ?? 'untitled') : docName(tab.path)
    label.textContent = prefix + dirtyMark + missingMark + name
    label.addEventListener('click', () => {
      switchToDoc(docId)
    })

    const closeBtn = document.createElement('button')
    closeBtn.textContent = 'Close'
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      closeDoc(docId)
    })

    li.appendChild(label)
    li.appendChild(closeBtn)
    tabsList.appendChild(li)
  }
}

function loadActiveBuffer(): void {
  const tab = activeTab()
  if (tab) {
    deps.setEditorContent(tab.content)
  } else {
    deps.setEditorContent('')
  }
}

async function switchToDoc(docId: string): Promise<void> {
  const currentId = getActiveDocId()
  if (currentId === docId) return
  if (currentId) {
    const cur = tabs.get(currentId)
    if (cur) cur.content = deps.getEditorContent()
  }
  try {
    await window.api.editor.switchDocument(docId)
  } catch (e) {
    console.warn('Failed to switch document', (e as Error).message)
  }
  setActiveDocId(docId)
  loadActiveBuffer()
  updateDocStatus()
  renderTabs()
  deps.refreshActiveHighlight()
  deps.loadBacklinks()
}

async function setDirty(value: boolean): Promise<void> {
  const tab = activeTab()
  if (!tab) return
  tab.dirty = value
  const id = getActiveDocId()
  if (id) {
    try {
      await window.api.editor.markDirty(id, value)
    } catch (e) {
      console.warn('Failed to mark dirty', (e as Error).message)
    }
  }
  updateDocStatus()
  renderTabs()
}

async function openFile(filePath: string): Promise<void> {
  const currentId = getActiveDocId()
  if (currentId) {
    const cur = tabs.get(currentId)
    if (cur) cur.content = deps.getEditorContent()
  }
  try {
    const result = await window.api.editor.openDocument(filePath)
    if (result.alreadyOpen) {
      setActiveDocId(result.docId)
      const tab = tabs.get(result.docId)
      if (tab) tab.content = result.content
    } else {
      tabs.set(result.docId, { path: result.path, content: result.content, dirty: false })
      setActiveDocId(result.docId)
    }
    loadActiveBuffer()
    updateDocStatus()
    renderTabs()
    deps.refreshActiveHighlight()
    deps.loadBacklinks()
  } catch (e) {
    alert((e as Error).message)
  }
}

async function closeDoc(docId: string): Promise<void> {
  const tab = tabs.get(docId)
  if (!tab) return
  if (tab.dirty) {
    const confirmed = confirm('Discard unsaved changes in ' + docName(tab.path) + '?')
    if (!confirmed) return
  }
  try {
    const result = await window.api.editor.closeDocument(docId)
    tabs.delete(docId)
    if (getActiveDocId() === docId) {
      setActiveDocId(result.newActiveId)
      loadActiveBuffer()
      deps.loadBacklinks()
    }
    updateDocStatus()
    renderTabs()
  } catch (e) {
    alert((e as Error).message)
  }
}

async function restoreTabs(): Promise<void> {
  let paths: string[]
  try {
    paths = await window.api.editor.getOpenTabs()
  } catch (e) {
    console.warn('Failed to get open tabs', (e as Error).message)
    return
  }
  for (const p of paths) {
    try {
      const result = await window.api.editor.openDocument(p)
      tabs.set(result.docId, { path: result.path, content: result.content, dirty: false })
      setActiveDocId(result.docId)
    } catch (e) {
      console.warn('Failed to restore tab', p, (e as Error).message)
    }
  }
  if (getActiveDocId()) {
    loadActiveBuffer()
    deps.loadBacklinks()
  }
  updateDocStatus()
  renderTabs()
}

export interface TabsApi {
  activeTab: () => TabState | null
  getTabs: () => Map<string, TabState>
  activeFilePath: () => string | null
  renderTabs: () => void
  updateDocStatus: () => void
  loadActiveBuffer: () => void
  switchToDoc: (docId: string) => Promise<void>
  setDirty: (value: boolean) => Promise<void>
  closeDoc: (docId: string) => Promise<void>
  openFile: (filePath: string) => Promise<void>
  restoreTabs: () => Promise<void>
}

export function initTabs(d: TabsDeps): TabsApi {
  deps = d
  return {
    activeTab,
    getTabs,
    activeFilePath,
    renderTabs,
    updateDocStatus,
    loadActiveBuffer,
    switchToDoc,
    setDirty,
    closeDoc,
    openFile,
    restoreTabs,
  }
}

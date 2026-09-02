/// <reference path="./env.d.ts" />

import { createEditorView } from './editor/cm-setup'
import type { EditorView } from '@codemirror/view'

const selectDirBtn = document.getElementById('select-dir') as HTMLButtonElement
const vaultPathEl = document.getElementById('vault-path') as HTMLHeadingElement

function basename(p: string): string {
  return p.split(/[/\\]/).filter(Boolean).pop() || p
}
const explorerTree = document.getElementById('explorer-tree') as HTMLUListElement
const explorerStatus = document.getElementById('explorer-status') as HTMLSpanElement
const selectedGroup = document.getElementById('selected-group') as HTMLDivElement
const selectedLabel = document.getElementById('selected-label') as HTMLSpanElement
const sidebarResizer = document.getElementById('sidebar-resizer') as HTMLDivElement

const docStatus = document.getElementById('doc-status') as HTMLSpanElement
const editorHost = document.getElementById('editor-host') as HTMLDivElement
const tabsList = document.getElementById('tabs-list') as HTMLUListElement
const backlinksList = document.getElementById('backlinks') as HTMLUListElement
const searchInput = document.getElementById('search') as HTMLInputElement
const searchResults = document.getElementById('search-results') as HTMLUListElement
const searchStatus = document.getElementById('search-status') as HTMLSpanElement
const searchBtn = document.getElementById('search-btn') as HTMLButtonElement

const promptDialog = document.getElementById('prompt-dialog') as HTMLDivElement
const promptMessage = document.getElementById('prompt-message') as HTMLSpanElement
const promptInput = document.getElementById('prompt-input') as HTMLInputElement
const promptOk = document.getElementById('prompt-ok') as HTMLButtonElement
const promptCancel = document.getElementById('prompt-cancel') as HTMLButtonElement

let promptResolve: ((value: string | null) => void) | null = null

function customPrompt(message: string, defaultValue: string): Promise<string | null> {
  return new Promise((resolve) => {
    promptResolve = resolve
    promptMessage.textContent = message
    promptInput.value = defaultValue
    promptDialog.hidden = false
    promptInput.focus()
    promptInput.select()
  })
}

function closePrompt(result: string | null): void {
  promptDialog.hidden = true
  if (promptResolve) {
    const r = promptResolve
    promptResolve = null
    r(result)
  }
}

promptOk.addEventListener('click', () => closePrompt(promptInput.value))
promptCancel.addEventListener('click', () => closePrompt(null))
promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    closePrompt(promptInput.value)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    closePrompt(null)
  }
})

let vaultRootPath: string | null = null
let selectedFolder: string | null = null
const expandedFolders = new Set<string>()
const nodeMap = new Map<string, HTMLLIElement>()

let saveFoldersTimer: ReturnType<typeof setTimeout> | null = null
function scheduleSaveExpandedFolders(): void {
  if (saveFoldersTimer) clearTimeout(saveFoldersTimer)
  saveFoldersTimer = setTimeout(() => {
    window.api.state.setExpandedFolders(Array.from(expandedFolders)).catch(() => {})
  }, 500)
}

interface TabState {
  path: string | null
  content: string
  dirty: boolean
  missing?: boolean
  missingName?: string
}
const tabs = new Map<string, TabState>()
let activeDocId: string | null = null

let editorView!: EditorView
let suppressChange = false

function getEditorContent(): string {
  return editorView.state.doc.toString()
}

function setEditorContent(content: string): void {
  suppressChange = true
  editorView.dispatch({ changes: { from: 0, to: editorView.state.doc.length, insert: content } })
  suppressChange = false
}

function onEditorContentChange(doc: string): void {
  if (suppressChange) return
  const tab = activeTab()
  if (tab) {
    tab.content = doc
    if (!tab.dirty) setDirty(true)
  }
}

let displayPath = ''
let measureCtx: CanvasRenderingContext2D | null = null

function measureText(text: string): number {
  if (!measureCtx) {
    const canvas = document.createElement('canvas')
    measureCtx = canvas.getContext('2d')
  }
  if (!measureCtx) return text.length * 7
  const style = getComputedStyle(explorerStatus)
  measureCtx.font = style.fontSize + ' ' + style.fontFamily
  return measureCtx.measureText(text).width
}

function computeTruncatedPath(p: string, maxWidth: number): string {
  if (!p || maxWidth <= 0) return ''
  const sep = p.includes('\\') ? '\\' : '/'
  const parts = p.split(/[/\\]/).filter(Boolean)
  if (parts.length === 0) return p
  const truncParts = parts.map(s => (s.length > 20 ? s.slice(0, 18) + '...' : s))
  const leadingSep = p.startsWith('/') ? '/' : ''
  for (let keep = truncParts.length; keep >= 1; keep--) {
    const child = truncParts.slice(-keep)
    const collapsed = parts.length - keep
    const candidate =
      collapsed > 0 ? '..' + sep + child.join(sep) : leadingSep + child.join(sep)
    if (measureText(candidate) <= maxWidth) return candidate
  }
  return '..' + sep + truncParts[truncParts.length - 1]
}

function renderTruncatedPath(): void {
  if (!displayPath) {
    explorerStatus.textContent = ''
    explorerStatus.title = ''
    return
  }
  const available = selectedGroup.clientWidth - selectedLabel.offsetWidth - 6
  explorerStatus.textContent = computeTruncatedPath(displayPath, available)
  explorerStatus.title = displayPath
}

new ResizeObserver(() => renderTruncatedPath()).observe(selectedGroup)

function updateSelectedFolderDisplay(): void {
  if (selectedFolder) {
    displayPath = selectedFolder
  } else if (vaultRootPath) {
    displayPath = vaultRootPath + ' (root)'
  } else {
    displayPath = ''
  }
  renderTruncatedPath()
}

function folderMarker(entryPath: string): string {
  return entryPath === selectedFolder ? '[*]' : '[-]'
}

function ensureMdExtension(name: string): string {
  return name.toLowerCase().endsWith('.md') ? name : name + '.md'
}

function docName(path: string | null): string {
  if (!path) return 'untitled'
  const parts = path.split('/')
  return parts[parts.length - 1]
}

function activeTab(): TabState | null {
  if (!activeDocId) return null
  return tabs.get(activeDocId) ?? null
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
    if (docId === activeDocId) {
      li.dataset.active = 'true'
    }

    const label = document.createElement('span')
    const prefix = docId === activeDocId ? '[Active] ' : ''
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
    setEditorContent(tab.content)
  } else {
    setEditorContent('')
  }
}

async function switchToDoc(docId: string): Promise<void> {
  if (activeDocId === docId) return
  if (activeDocId) {
    const cur = tabs.get(activeDocId)
    if (cur) cur.content = getEditorContent()
  }
  try {
    await window.api.editor.switchDocument(docId)
  } catch (e) {
    console.warn('Failed to switch document', (e as Error).message)
  }
  activeDocId = docId
  loadActiveBuffer()
  updateDocStatus()
  renderTabs()
  refreshActiveHighlight()
  loadBacklinks()
}

async function setDirty(value: boolean): Promise<void> {
  const tab = activeTab()
  if (!tab) return
  tab.dirty = value
  if (activeDocId) {
    try {
      await window.api.editor.markDirty(activeDocId, value)
    } catch (e) {
      console.warn('Failed to mark dirty', (e as Error).message)
    }
  }
  updateDocStatus()
  renderTabs()
}

function noteNameFromPath(filePath: string): string {
  const basename = docName(filePath)
  return basename.toLowerCase().endsWith('.md') ? basename.slice(0, -3) : basename
}

async function loadBacklinks(): Promise<void> {
  const tab = activeTab()
  if (!tab || !tab.path) {
    backlinksList.innerHTML = ''
    return
  }
  const noteName = noteNameFromPath(tab.path)
  try {
    const backlinks = await window.api.knowledge.findBacklinks(noteName)
    backlinksList.innerHTML = ''
    if (backlinks.length === 0) {
      const li = document.createElement('li')
      li.textContent = 'No backlinks'
      backlinksList.appendChild(li)
    } else {
      for (const bl of backlinks) {
        const li = document.createElement('li')
        const span = document.createElement('span')
        span.textContent = bl.sourceName
        span.addEventListener('click', () => {
          openFile(bl.sourcePath)
        })
        li.appendChild(span)
        backlinksList.appendChild(li)
      }
    }
  } catch (e) {
    console.warn('Failed to load backlinks', (e as Error).message)
  }
}

async function handleEntryContextMenu(entryPath: string, currentName: string, kind: 'folder' | 'file'): Promise<void> {
  const result = await window.api.vault.contextMenu(entryPath, kind)
  if (!result) return

  if (result.action === 'rename') {
    const newName = await customPrompt('Enter new name:', currentName)
    if (!newName || newName === currentName) return
    try {
      await window.api.vault.renameEntry(entryPath, newName)
      await loadExplorer()
    } catch (e) {
      alert((e as Error).message)
    }
  } else if (result.action === 'new-file') {
    const fileName = await customPrompt('Enter file name:', 'untitled.md')
    if (!fileName) return
    try {
      await window.api.vault.createNote(entryPath, ensureMdExtension(fileName), '')
      await loadExplorer()
    } catch (e) {
      alert((e as Error).message)
    }
  } else if (result.action === 'new-folder') {
    const folderName = await customPrompt('Enter folder name:', 'untitled-folder')
    if (!folderName) return
    try {
      await window.api.vault.createFolder(entryPath, folderName)
      await loadExplorer()
    } catch (e) {
      alert((e as Error).message)
    }
  } else if (result.action === 'delete') {
    const confirmed = confirm('Delete "' + currentName + '" and all its contents?')
    if (!confirmed) return
    try {
      await window.api.vault.deleteEntry(entryPath)
      if (selectedFolder === entryPath) {
        selectedFolder = vaultRootPath
        updateSelectedFolderDisplay()
      }
      await loadExplorer()
    } catch (e) {
      alert((e as Error).message)
    }
  }
}

async function handleRootContextMenu(): Promise<void> {
  if (!vaultRootPath) return
  const result = await window.api.vault.contextMenu(vaultRootPath, 'root')
  if (!result) return

  if (result.action === 'new-file') {
    const fileName = await customPrompt('Enter file name:', 'untitled.md')
    if (!fileName) return
    try {
      await window.api.vault.createNote(vaultRootPath, ensureMdExtension(fileName), '')
      await loadExplorer()
    } catch (e) {
      alert((e as Error).message)
    }
  } else if (result.action === 'new-folder') {
    const folderName = await customPrompt('Enter folder name:', 'untitled-folder')
    if (!folderName) return
    try {
      await window.api.vault.createFolder(vaultRootPath, folderName)
      await loadExplorer()
    } catch (e) {
      alert((e as Error).message)
    }
  }
}

async function loadCurrentVault(): Promise<void> {
  try {
    const vault = await window.api.vault.getCurrentVault()
    if (vault) {
      vaultRootPath = vault.rootPath
      selectedFolder = vault.rootPath
      vaultPathEl.textContent = basename(vault.rootPath)
      vaultPathEl.title = vault.rootPath
      try {
        const folders = await window.api.state.getExpandedFolders()
        expandedFolders.clear()
        for (const f of folders) expandedFolders.add(f)
      } catch (e) {
        console.warn('Failed to restore expanded folders', (e as Error).message)
      }
      await loadExplorer()
      await restoreTabs()
      try {
        const activePath = await window.api.state.getActiveTabPath()
        if (activePath) {
          for (const [docId, tab] of tabs) {
            if (tab.path === activePath) {
              activeDocId = docId
              break
            }
          }
          loadActiveBuffer()
          updateDocStatus()
          renderTabs()
          refreshActiveHighlight()
          loadBacklinks()
        }
      } catch (e) {
        console.warn('Failed to restore active tab', (e as Error).message)
      }
    } else {
      vaultRootPath = null
      selectedFolder = null
      vaultPathEl.textContent = 'No vault selected'
      vaultPathEl.title = ''
      updateSelectedFolderDisplay()
    }
  } catch (e) {
    vaultPathEl.textContent = '[Error: ' + (e as Error).message + ']'
    vaultPathEl.title = ''
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
      activeDocId = result.docId
    } catch (e) {
      console.warn('Failed to restore tab', p, (e as Error).message)
    }
  }
  if (activeDocId) {
    loadActiveBuffer()
    loadBacklinks()
  }
  updateDocStatus()
  renderTabs()
}

async function loadExplorer(): Promise<void> {
  if (!vaultRootPath) {
    updateSelectedFolderDisplay()
    return
  }
  try {
    const entries = await window.api.vault.listNotes()
    explorerTree.innerHTML = ''
    nodeMap.clear()
    if (entries.length === 0) {
      explorerStatus.textContent = 'Vault is empty'
    } else {
      explorerTree.appendChild(renderTree(entries))
      updateSelectedFolderDisplay()
      refreshActiveHighlight()
    }
  } catch (e) {
    explorerStatus.textContent = '[Error: ' + (e as Error).message + ']'
  }
}

function renderTree(entries: NoteEntryDto[]): HTMLUListElement {
  const ul = document.createElement('ul')
  for (const entry of entries) {
    ul.appendChild(renderEntry(entry))
  }
  return ul
}

function renderEntry(entry: NoteEntryDto): HTMLLIElement {
  const li = document.createElement('li')
  li.dataset.path = entry.path
  li.dataset.dir = entry.isDirectory ? '1' : '0'
  nodeMap.set(entry.path, li)

  if (entry.isDirectory) {
    const toggle = document.createElement('button')
    toggle.textContent = folderMarker(entry.path) + ' ' + entry.name
    const childUl = renderTree(entry.children)
    childUl.hidden = !expandedFolders.has(entry.path)

    toggle.addEventListener('click', () => {
      const collapsed = !childUl.hidden
      childUl.hidden = collapsed
      if (collapsed) expandedFolders.delete(entry.path)
      else expandedFolders.add(entry.path)
      scheduleSaveExpandedFolders()
      selectedFolder = entry.path
      updateSelectedFolderDisplay()
      refreshAllMarkers()
    })

    toggle.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      e.stopPropagation()
      handleEntryContextMenu(entry.path, entry.name, 'folder')
    })

    li.appendChild(toggle)
    li.appendChild(childUl)
  } else {
    const span = document.createElement('span')
    span.textContent = entry.name.toLowerCase().endsWith('.md') ? entry.name.slice(0, -3) : entry.name
    span.addEventListener('click', () => {
      openFile(entry.path)
    })
    span.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      e.stopPropagation()
      handleEntryContextMenu(entry.path, entry.name, 'file')
    })
    li.appendChild(span)
  }

  return li
}

function refreshAllMarkers(): void {
  const buttons = explorerTree.querySelectorAll('button')
  for (const btn of buttons) {
    const li = btn.parentElement
    if (!li) continue
    const childUl = li.querySelector('ul') as HTMLUListElement | null
    if (!childUl) continue
    const entryPath = (li.dataset.path as string) || ''
    const name = btn.textContent?.split(' ').slice(1).join(' ') || ''
    const marker = childUl.hidden ? '[+]' : folderMarker(entryPath)
    btn.textContent = marker + ' ' + name
  }
}

function activeFilePath(): string | null {
  if (!activeDocId) return null
  return tabs.get(activeDocId)?.path ?? null
}

function refreshActiveHighlight(): void {
  const prev = explorerTree.querySelectorAll('li[data-active="true"]')
  for (const li of prev) li.removeAttribute('data-active')
  const active = activeFilePath()
  if (active) {
    const li = nodeMap.get(active)
    if (li) li.dataset.active = 'true'
  }
}

async function openFile(filePath: string): Promise<void> {
  if (activeDocId) {
    const cur = tabs.get(activeDocId)
    if (cur) cur.content = getEditorContent()
  }
  try {
    const result = await window.api.editor.openDocument(filePath)
    if (result.alreadyOpen) {
      activeDocId = result.docId
      const tab = tabs.get(result.docId)
      if (tab) tab.content = result.content
    } else {
      tabs.set(result.docId, { path: result.path, content: result.content, dirty: false })
      activeDocId = result.docId
    }
    loadActiveBuffer()
    updateDocStatus()
    renderTabs()
    refreshActiveHighlight()
    loadBacklinks()
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
    if (activeDocId === docId) {
      activeDocId = result.newActiveId
      loadActiveBuffer()
      loadBacklinks()
    }
    updateDocStatus()
    renderTabs()
  } catch (e) {
    alert((e as Error).message)
  }
}

selectDirBtn.addEventListener('click', async () => {
  selectDirBtn.disabled = true
  try {
    const vault = await window.api.vault.openVault()
    if (vault) {
      vaultRootPath = vault.rootPath
      selectedFolder = vault.rootPath
      vaultPathEl.textContent = basename(vault.rootPath)
      vaultPathEl.title = vault.rootPath
      expandedFolders.clear()
      await loadExplorer()
    }
  } catch (e) {
    alert((e as Error).message)
  } finally {
    selectDirBtn.disabled = false
  }
})

const explorerPanel = document.getElementById('explorer') as HTMLDivElement
explorerPanel.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  handleRootContextMenu()
})

async function handleWikiLinkClick(name: string): Promise<void> {
  try {
    const resolved = await window.api.knowledge.resolveLink(name)
    if (resolved) {
      await openFile(resolved.path)
    } else {
      const confirmed = confirm("Create note '" + name + "'?")
      if (confirmed) {
        const result = await window.api.knowledge.createNoteFromLink(name)
        await loadExplorer()
        await openFile(result.path)
      }
    }
  } catch (e) {
    alert((e as Error).message)
  }
}

async function handleTagClick(tag: string): Promise<void> {
  try {
    const notes = await window.api.knowledge.findNotesByTag(tag)
    if (notes.length === 0) {
      alert('No notes with tag #' + tag)
    } else {
      const lines = notes.map(n => n.name + ' -> ' + n.path)
      alert('Notes with tag #' + tag + ':\n\n' + lines.join('\n'))
    }
  } catch (e) {
    alert((e as Error).message)
  }
}

editorHost.addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  if (target.dataset.wiki) {
    e.preventDefault()
    handleWikiLinkClick(target.dataset.wiki)
  } else if (target.dataset.tag) {
    e.preventDefault()
    handleTagClick(target.dataset.tag)
  }
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

function scheduleSearch(): void {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    runSearch()
  }, 200)
}

async function runSearch(): Promise<void> {
  const query = searchInput.value.trim()
  if (!query) {
    searchResults.innerHTML = ''
    searchStatus.textContent = ''
    return
  }
  searchBtn.textContent = 'Searching...'
  searchBtn.disabled = true
  searchStatus.textContent = 'Searching...'
  try {
    const results = await window.api.search.searchNotes(query)
    searchResults.innerHTML = ''
    if (results.length === 0) {
      searchStatus.textContent = 'No results'
    } else {
      searchStatus.textContent = results.length + ' results'
      for (const r of results) {
        const li = document.createElement('li')
        const nameEl = document.createElement('strong')
        nameEl.textContent = r.name + ' (' + r.matchCount + ')'
        const snippetEl = document.createElement('div')
        snippetEl.textContent = r.snippet
        li.appendChild(nameEl)
        li.appendChild(snippetEl)
        li.addEventListener('click', () => {
          openFile(r.path)
        })
        searchResults.appendChild(li)
      }
    }
  } catch (e) {
    searchStatus.textContent = '[Error: ' + (e as Error).message + ']'
  } finally {
    searchBtn.textContent = 'Search'
    searchBtn.disabled = false
  }
}

searchInput.addEventListener('input', () => {
  scheduleSearch()
})

searchBtn.addEventListener('click', () => {
  runSearch()
})

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    runSearch()
  }
})

function pathDirname(p: string): string {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return idx >= 0 ? p.slice(0, idx) : ''
}

function pathBasename(p: string): string {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return idx >= 0 ? p.slice(idx + 1) : p
}

function sortBefore(aIsDir: boolean, aName: string, bIsDir: boolean, bName: string): boolean {
  if (aIsDir !== bIsDir) return aIsDir
  return aName.toLowerCase() < bName.toLowerCase()
}

function insertNode(path: string, isDir: boolean): void {
  if (nodeMap.has(path)) return
  const parentPath = pathDirname(path)
  const parentLi = parentPath ? nodeMap.get(parentPath) : null
  let parentUl: HTMLUListElement
  if (parentLi) {
    let ul = parentLi.querySelector('ul') as HTMLUListElement | null
    if (!ul) {
      ul = document.createElement('ul')
      ul.hidden = !expandedFolders.has(parentPath)
      parentLi.appendChild(ul)
    }
    parentUl = ul
  } else {
    parentUl = explorerTree
  }
  const name = pathBasename(path)
  const entry: NoteEntryDto = { path, name, isDirectory: isDir, children: [] }
  const newLi = renderEntry(entry)
  const siblings = Array.from(parentUl.children) as HTMLLIElement[]
  let inserted = false
  for (const sib of siblings) {
    const sibPath = sib.dataset.path || ''
    const sibName = pathBasename(sibPath)
    const sibIsDir = sib.dataset.dir === '1'
    if (sortBefore(isDir, name, sibIsDir, sibName)) {
      parentUl.insertBefore(newLi, sib)
      inserted = true
      break
    }
  }
  if (!inserted) parentUl.appendChild(newLi)
}

function removeNodeFromMap(path: string, li: HTMLLIElement): void {
  nodeMap.delete(path)
  const childUl = li.querySelector('ul') as HTMLUListElement | null
  if (childUl) {
    for (const child of Array.from(childUl.children) as HTMLLIElement[]) {
      const childPath = child.dataset.path || ''
      if (childPath) removeNodeFromMap(childPath, child)
    }
  }
}

function updateNodePath(li: HTMLLIElement, oldPrefix: string, newPrefix: string): void {
  const oldPath = li.dataset.path || ''
  const newPath = newPrefix + oldPath.slice(oldPrefix.length)
  li.dataset.path = newPath
  nodeMap.delete(oldPath)
  nodeMap.set(newPath, li)
  const childUl = li.querySelector('ul') as HTMLUListElement | null
  if (childUl) {
    for (const child of Array.from(childUl.children) as HTMLLIElement[]) {
      updateNodePath(child, oldPrefix, newPrefix)
    }
  }
}

function renameDirNode(oldPath: string, newPath: string): void {
  const li = nodeMap.get(oldPath)
  if (!li) return
  if (expandedFolders.has(oldPath)) {
    expandedFolders.delete(oldPath)
    expandedFolders.add(newPath)
  }
  if (selectedFolder === oldPath) selectedFolder = newPath
  updateNodePath(li, oldPath, newPath)
  const toggle = li.querySelector('button') as HTMLButtonElement | null
  if (toggle) {
    const marker = !expandedFolders.has(newPath) ? '[+]' : folderMarker(newPath)
    toggle.textContent = marker + ' ' + pathBasename(newPath)
  }
}

async function renameFileNode(oldPath: string, newPath: string): Promise<void> {
  const li = nodeMap.get(oldPath)
  if (li) {
    li.dataset.path = newPath
    nodeMap.delete(oldPath)
    nodeMap.set(newPath, li)
    const span = li.querySelector('span') as HTMLSpanElement | null
    if (span) {
      const name = pathBasename(newPath)
      span.textContent = name.toLowerCase().endsWith('.md') ? name.slice(0, -3) : name
    }
  }
  for (const [docId, tab] of tabs) {
    if (tab.path === oldPath) {
      tab.path = newPath
      try {
        await window.api.editor.updatePath(docId, newPath)
      } catch (e) {
        console.warn('Failed to update doc path', (e as Error).message)
      }
    }
  }
  if (activeDocId && tabs.get(activeDocId)?.path === newPath) {
    updateDocStatus()
    renderTabs()
  }
}

async function handleChange(filePath: string): Promise<void> {
  if (!activeDocId) return
  const tab = tabs.get(activeDocId)
  if (!tab || tab.path !== filePath || tab.dirty) return
  try {
    const content = await window.api.vault.readNote(filePath)
    tab.content = content
    if (activeDocId && tabs.get(activeDocId)?.path === filePath) {
      setEditorContent(content)
    }
  } catch (e) {
    console.warn('Failed to reload changed note', (e as Error).message)
  }
}

async function handleUnlink(entryPath: string, isDir: boolean): Promise<void> {
  const wasActive = activeFilePath() === entryPath

  if (isDir) {
    const li = nodeMap.get(entryPath)
    if (li) {
      removeNodeFromMap(entryPath, li)
      li.remove()
    }
    if (selectedFolder && (selectedFolder === entryPath || selectedFolder.startsWith(entryPath + '/') || selectedFolder.startsWith(entryPath + '\\'))) {
      selectedFolder = pathDirname(entryPath) || vaultRootPath
      updateSelectedFolderDisplay()
      refreshAllMarkers()
    }
    return
  }

  let siblingFile: string | null = null
  if (wasActive) {
    const parentPath = pathDirname(entryPath)
    const parentLi = parentPath ? nodeMap.get(parentPath) : null
    const parentUl = parentLi ? (parentLi.querySelector('ul') as HTMLUListElement | null) : explorerTree
    if (parentUl) {
      const children = Array.from(parentUl.children) as HTMLLIElement[]
      const idx = children.findIndex(c => c.dataset.path === entryPath)
      if (idx >= 0) {
        for (let i = idx + 1; i < children.length; i++) {
          if (children[i].dataset.dir === '0') { siblingFile = children[i].dataset.path!; break }
        }
        if (!siblingFile) {
          for (let i = idx - 1; i >= 0; i--) {
            if (children[i].dataset.dir === '0') { siblingFile = children[i].dataset.path!; break }
          }
        }
      }
    }
  }

  const li = nodeMap.get(entryPath)
  if (li) {
    removeNodeFromMap(entryPath, li)
    li.remove()
  }

  for (const [docId, tab] of Array.from(tabs)) {
    if (tab.path === entryPath) {
      if (tab.dirty) {
        tab.path = null
        tab.missing = true
        tab.missingName = pathBasename(entryPath)
        if (docId === activeDocId) {
          updateDocStatus()
          renderTabs()
        }
      } else {
        await closeDoc(docId)
      }
    }
  }

  if (wasActive) {
    if (siblingFile) {
      await openFile(siblingFile)
    } else {
      selectedFolder = pathDirname(entryPath) || vaultRootPath
      updateSelectedFolderDisplay()
      refreshAllMarkers()
    }
  }
}

async function handleWatchEvents(batch: WatchEventDto[]): Promise<void> {
  if (!vaultRootPath) return
  const used = new Set<number>()
  const renames: { old: string; new: string; isDir: boolean }[] = []

  for (let i = 0; i < batch.length; i++) {
    if (used.has(i)) continue
    const e = batch[i]
    if (e.type !== 'unlink' && e.type !== 'unlinkDir') continue
    const isDir = e.type === 'unlinkDir'
    const addType = isDir ? 'addDir' : 'add'
    for (let j = 0; j < batch.length; j++) {
      if (used.has(j) || j === i) continue
      const f = batch[j]
      if (f.type !== addType) continue
      if (pathDirname(e.path) === pathDirname(f.path)) {
        renames.push({ old: e.path, new: f.path, isDir })
        used.add(i)
        used.add(j)
        if (isDir) {
          for (let k = 0; k < batch.length; k++) {
            if (used.has(k)) continue
            const c = batch[k]
            if (c.path === e.path || c.path.startsWith(e.path + '/') || c.path.startsWith(e.path + '\\') ||
                c.path === f.path || c.path.startsWith(f.path + '/') || c.path.startsWith(f.path + '\\')) {
              used.add(k)
            }
          }
        }
        break
      }
    }
  }

  const remaining = batch.filter((_, i) => !used.has(i))

  for (const r of renames) {
    if (r.isDir) renameDirNode(r.old, r.new)
    else await renameFileNode(r.old, r.new)
  }

  const order: Record<string, number> = { addDir: 0, add: 1, change: 2, unlink: 3, unlinkDir: 4 }
  remaining.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9))

  for (const e of remaining) {
    if (e.type === 'addDir') insertNode(e.path, true)
    else if (e.type === 'add') insertNode(e.path, false)
    else if (e.type === 'change') await handleChange(e.path)
    else if (e.type === 'unlink') await handleUnlink(e.path, false)
    else if (e.type === 'unlinkDir') await handleUnlink(e.path, true)
  }

  refreshActiveHighlight()
}

window.api.vault.onNoteChanged((batch) => {
  handleWatchEvents(batch).catch((e) => console.warn('watch error', (e as Error).message))
})

editorView = createEditorView(editorHost, '', onEditorContentChange)

updateDocStatus()
loadCurrentVault()

const SIDEBAR_MIN = 180
const SIDEBAR_MAX = 600
const SIDEBAR_DEFAULT = 280

const sidebarSheet = new CSSStyleSheet()
sidebarSheet.replaceSync(':root { --sidebar-width: ' + SIDEBAR_DEFAULT + 'px }')
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sidebarSheet]

let currentSidebarWidth = SIDEBAR_DEFAULT

function setSidebarWidth(width: number): void {
  currentSidebarWidth = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, width))
  sidebarSheet.replaceSync(':root { --sidebar-width: ' + currentSidebarWidth + 'px }')
}

window.api.state.getSidebarWidth().then((width) => {
  if (width !== null) setSidebarWidth(width)
}).catch(() => {})

sidebarResizer.addEventListener('mousedown', (e) => {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = currentSidebarWidth
  document.body.classList.add('dragging')

  const onMove = (ev: MouseEvent): void => {
    setSidebarWidth(startWidth + (ev.clientX - startX))
  }
  const onUp = (): void => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.classList.remove('dragging')
    window.api.state.setSidebarWidth(currentSidebarWidth).catch(() => {})
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
})

sidebarResizer.addEventListener('dblclick', () => {
  setSidebarWidth(SIDEBAR_DEFAULT)
  window.api.state.setSidebarWidth(SIDEBAR_DEFAULT).catch(() => {})
})

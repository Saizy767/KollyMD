/// <reference path="./env.d.ts" />

const selectDirBtn = document.getElementById('select-dir') as HTMLButtonElement
const vaultPathEl = document.getElementById('vault-path') as HTMLSpanElement
const refreshBtn = document.getElementById('refresh-explorer') as HTMLButtonElement
const createBtn = document.getElementById('create-note') as HTMLButtonElement
const explorerTree = document.getElementById('explorer-tree') as HTMLUListElement
const explorerStatus = document.getElementById('explorer-status') as HTMLSpanElement

const newDocBtn = document.getElementById('new-doc') as HTMLButtonElement
const saveDocBtn = document.getElementById('save-doc') as HTMLButtonElement
const saveAsDocBtn = document.getElementById('save-as-doc') as HTMLButtonElement
const docStatus = document.getElementById('doc-status') as HTMLSpanElement
const editor = document.getElementById('editor') as HTMLTextAreaElement
const tabsList = document.getElementById('tabs-list') as HTMLUListElement
const preview = document.getElementById('preview') as HTMLDivElement
const previewStatus = document.getElementById('preview-status') as HTMLSpanElement
const backlinksList = document.getElementById('backlinks') as HTMLUListElement
const searchInput = document.getElementById('search') as HTMLInputElement
const searchResults = document.getElementById('search-results') as HTMLUListElement
const searchStatus = document.getElementById('search-status') as HTMLSpanElement
const searchBtn = document.getElementById('search-btn') as HTMLButtonElement

let vaultRootPath: string | null = null
let selectedFolder: string | null = null

interface TabState {
  path: string | null
  content: string
  dirty: boolean
}
const tabs = new Map<string, TabState>()
let activeDocId: string | null = null

function updateSelectedFolderDisplay(): void {
  if (selectedFolder) {
    explorerStatus.textContent = 'Selected: ' + selectedFolder
  } else if (vaultRootPath) {
    explorerStatus.textContent = 'Selected: ' + vaultRootPath + ' (root)'
  } else {
    explorerStatus.textContent = 'No vault selected'
  }
  createBtn.disabled = !vaultRootPath
}

function folderMarker(entryPath: string): string {
  return entryPath === selectedFolder ? '[*]' : '[-]'
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
    label.textContent = prefix + dirtyMark + docName(tab.path)
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
    editor.value = tab.content
  } else {
    editor.value = ''
  }
}

async function switchToDoc(docId: string): Promise<void> {
  if (activeDocId === docId) return
  if (activeDocId) {
    const cur = tabs.get(activeDocId)
    if (cur) cur.content = editor.value
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
  schedulePreview()
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

let previewTimer: ReturnType<typeof setTimeout> | null = null

function schedulePreview(): void {
  if (previewTimer) clearTimeout(previewTimer)
  previewTimer = setTimeout(() => {
    renderPreview()
  }, 150)
}

async function renderPreview(): Promise<void> {
  const tab = activeTab()
  if (!tab) {
    preview.innerHTML = ''
    previewStatus.textContent = ''
    return
  }
  const content = editor.value
  try {
    const result = await window.api.knowledge.render(content)
    preview.innerHTML = result.html
    previewStatus.textContent = ''
  } catch (e) {
    previewStatus.textContent = '[Error: ' + (e as Error).message + ']'
  }
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

preview.addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  if (target.dataset.wiki) {
    e.preventDefault()
    handleWikiLinkClick(target.dataset.wiki)
  } else if (target.dataset.tag) {
    e.preventDefault()
    handleTagClick(target.dataset.tag)
  }
})

async function loadCurrentVault(): Promise<void> {
  try {
    const vault = await window.api.vault.getCurrentVault()
    if (vault) {
      vaultRootPath = vault.rootPath
      selectedFolder = vault.rootPath
      vaultPathEl.textContent = vault.rootPath
      await loadExplorer()
      await restoreTabs()
    } else {
      vaultRootPath = null
      selectedFolder = null
      vaultPathEl.textContent = 'No vault selected'
      updateSelectedFolderDisplay()
    }
  } catch (e) {
    vaultPathEl.textContent = '[Error: ' + (e as Error).message + ']'
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
    schedulePreview()
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
  refreshBtn.textContent = 'Loading...'
  refreshBtn.disabled = true
  try {
    const entries = await window.api.vault.listNotes()
    explorerTree.innerHTML = ''
    if (entries.length === 0) {
      explorerStatus.textContent = 'Vault is empty'
    } else {
      explorerTree.appendChild(renderTree(entries))
      updateSelectedFolderDisplay()
    }
  } catch (e) {
    explorerStatus.textContent = '[Error: ' + (e as Error).message + ']'
  } finally {
    refreshBtn.textContent = 'Refresh'
    refreshBtn.disabled = false
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

  if (entry.isDirectory) {
    const toggle = document.createElement('button')
    toggle.textContent = folderMarker(entry.path) + ' ' + entry.name
    const childUl = renderTree(entry.children)
    childUl.hidden = false
    li.dataset.path = entry.path

    toggle.addEventListener('click', () => {
      const collapsed = !childUl.hidden
      childUl.hidden = collapsed
      selectedFolder = entry.path
      updateSelectedFolderDisplay()
      refreshAllMarkers()
    })

    li.appendChild(toggle)
    li.appendChild(childUl)
  } else {
    const span = document.createElement('span')
    span.textContent = entry.name
    span.addEventListener('click', () => {
      openFile(entry.path)
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

async function openFile(filePath: string): Promise<void> {
  if (activeDocId) {
    const cur = tabs.get(activeDocId)
    if (cur) cur.content = editor.value
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
    schedulePreview()
    loadBacklinks()
  } catch (e) {
    alert((e as Error).message)
  }
}

async function doSave(): Promise<void> {
  const tab = activeTab()
  if (!tab) return
  tab.content = editor.value
  try {
    await window.api.editor.saveDocument(tab.content)
    tab.dirty = false
    updateDocStatus()
    renderTabs()
  } catch (e) {
    const kollyErr = e as KollyError
    if (kollyErr.code === 'DOCUMENT_HAS_NO_PATH') {
      await doSaveAs()
    } else {
      alert((e as Error).message)
    }
  }
}

async function doSaveAs(): Promise<void> {
  const tab = activeTab()
  if (!tab) return
  tab.content = editor.value
  try {
    const result = await window.api.editor.saveAsDocument(tab.content)
    if (result) {
      tab.path = result.path
      tab.dirty = false
      updateDocStatus()
      renderTabs()
      await loadExplorer()
    }
  } catch (e) {
    alert((e as Error).message)
  }
}

async function doNew(): Promise<void> {
  if (activeDocId) {
    const cur = tabs.get(activeDocId)
    if (cur) cur.content = editor.value
  }
  try {
    const result = await window.api.editor.newDocument()
    tabs.set(result.docId, { path: null, content: '', dirty: false })
    activeDocId = result.docId
    loadActiveBuffer()
    updateDocStatus()
    renderTabs()
    schedulePreview()
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
      schedulePreview()
      loadBacklinks()
    }
    updateDocStatus()
    renderTabs()
  } catch (e) {
    alert((e as Error).message)
  }
}

selectDirBtn.addEventListener('click', async () => {
  selectDirBtn.textContent = 'Loading...'
  selectDirBtn.disabled = true
  try {
    const vault = await window.api.vault.openVault()
    if (vault) {
      vaultRootPath = vault.rootPath
      selectedFolder = vault.rootPath
      vaultPathEl.textContent = vault.rootPath
      await loadExplorer()
    }
  } catch (e) {
    alert((e as Error).message)
  } finally {
    selectDirBtn.textContent = 'Select Directory'
    selectDirBtn.disabled = false
  }
})

vaultPathEl.addEventListener('click', () => {
  if (vaultRootPath) {
    selectedFolder = vaultRootPath
    updateSelectedFolderDisplay()
    refreshAllMarkers()
  }
})

refreshBtn.addEventListener('click', () => {
  loadExplorer()
})

createBtn.addEventListener('click', async () => {
  if (!selectedFolder) {
    alert('No folder selected')
    return
  }
  createBtn.textContent = 'Creating...'
  createBtn.disabled = true
  try {
    const result = await window.api.vault.createNote(selectedFolder, 'unnamedfile.md', '')
    await loadExplorer()
    alert('Created: ' + result.path)
  } catch (e) {
    alert((e as Error).message)
  } finally {
    createBtn.textContent = 'Create'
    createBtn.disabled = !vaultRootPath
  }
})

editor.addEventListener('input', () => {
  const tab = activeTab()
  if (tab && !tab.dirty) {
    setDirty(true)
  }
  schedulePreview()
})

newDocBtn.addEventListener('click', () => {
  doNew()
})

saveDocBtn.addEventListener('click', () => {
  doSave()
})

saveAsDocBtn.addEventListener('click', () => {
  doSaveAs()
})

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    doSave()
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

updateDocStatus()
loadCurrentVault()

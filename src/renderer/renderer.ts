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

let vaultRootPath: string | null = null
let selectedFolder: string | null = null
let currentPath: string | null = null

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

function docName(): string {
  if (!currentPath) return 'untitled'
  const parts = currentPath.split('/')
  return parts[parts.length - 1]
}

async function updateDocStatus(): Promise<void> {
  const dirty = currentPath === null ? false : await isDirty()
  const prefix = dirty ? '[unsaved] ' : ''
  docStatus.textContent = prefix + docName()
}

let dirtyFlag = false

async function isDirty(): Promise<boolean> {
  return dirtyFlag
}

async function setDirty(value: boolean): Promise<void> {
  dirtyFlag = value
  try {
    await window.api.editor.markDirty(value)
  } catch {
    // silent
  }
  updateDocStatus()
}

async function loadCurrentVault(): Promise<void> {
  try {
    const vault = await window.api.vault.getCurrentVault()
    if (vault) {
      vaultRootPath = vault.rootPath
      selectedFolder = vault.rootPath
      vaultPathEl.textContent = vault.rootPath
      await loadExplorer()
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
  try {
    const result = await window.api.editor.openDocument(filePath)
    currentPath = result.path
    editor.value = result.content
    dirtyFlag = false
    await updateDocStatus()
  } catch (e) {
    alert((e as Error).message)
  }
}

async function doSave(): Promise<void> {
  const content = editor.value
  try {
    await window.api.editor.saveDocument(content)
    dirtyFlag = false
    await updateDocStatus()
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
  const content = editor.value
  try {
    const result = await window.api.editor.saveAsDocument(content)
    if (result) {
      currentPath = result.path
      dirtyFlag = false
      await updateDocStatus()
      await loadExplorer()
    }
  } catch (e) {
    alert((e as Error).message)
  }
}

async function doNew(): Promise<void> {
  try {
    await window.api.editor.newDocument()
    currentPath = null
    editor.value = ''
    dirtyFlag = false
    await updateDocStatus()
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
  if (!dirtyFlag) {
    setDirty(true)
  }
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

updateDocStatus()
loadCurrentVault()

import './panel.css'
import rightArrowUrl from './right-arrow.svg'
import bottomArrowUrl from './bottom-arrow.svg'
import { basename, pathBasename, ensureMdExtension } from '@renderer/utils/path'
import { customPrompt } from '@renderer/ui/prompt-dialog'
import {
  getVaultRootPath, setVaultRootPath,
  getSelectedFolder, setSelectedFolder,
  getExpandedFolders, getNodeMap,
  setActiveDocId,
} from '@renderer/state'
import { updateSelectedFolderDisplay, getVaultPathEl } from '@renderer/regions/sidebar'
import { initExplorerWatch } from './watch'
import type { EditorApi } from '@renderer/regions/editor'
import type { TabsApi } from '@renderer/regions/tabs'
import type { ModContext } from '../types'

export interface ExplorerHandle {
  showPanel: () => void
  hidePanel: () => void
  restoreState: () => Promise<void>
  loadExplorer: () => Promise<void>
  refreshActiveHighlight: () => void
  loadCurrentVault: () => Promise<void>
}

let editorApi: EditorApi
let tabsApi: TabsApi
let modId: string
let explorerTree: HTMLUListElement
let explorerPanel: HTMLDivElement
let explorerStatus: HTMLSpanElement
let selectDirBtn: HTMLButtonElement

let saveFoldersTimer: ReturnType<typeof setTimeout> | null = null
function scheduleSaveExpandedFolders(): void {
  if (saveFoldersTimer) clearTimeout(saveFoldersTimer)
  saveFoldersTimer = setTimeout(() => {
    window.api.state.setExpandedFolders(Array.from(getExpandedFolders())).catch(() => {})
  }, 500)
}

export function setFolderButtonContent(btn: HTMLButtonElement, name: string, collapsed: boolean, selected: boolean): void {
  btn.replaceChildren()
  const img = document.createElement('img')
  img.className = 'folder-arrow'
  img.src = collapsed ? rightArrowUrl : bottomArrowUrl
  img.alt = collapsed ? 'Expand' : 'Collapse'
  const span = document.createElement('span')
  span.className = 'folder-name'
  span.textContent = name
  btn.appendChild(img)
  btn.appendChild(span)
  if (selected) btn.dataset.selected = 'true'
  else delete btn.dataset.selected
}

async function loadExplorer(): Promise<void> {
  if (!getVaultRootPath()) {
    updateSelectedFolderDisplay()
    return
  }
  try {
    const entries = await window.api.vault.listNotes()
    explorerTree.innerHTML = ''
    getNodeMap().clear()
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
  getNodeMap().set(entry.path, li)

  if (entry.isDirectory) {
    const toggle = document.createElement('button')
    const collapsed = !getExpandedFolders().has(entry.path)
    setFolderButtonContent(toggle, entry.name, collapsed, entry.path === getSelectedFolder())
    const childUl = renderTree(entry.children)
    childUl.hidden = collapsed

    toggle.addEventListener('click', () => {
      const collapsed = !childUl.hidden
      childUl.hidden = collapsed
      if (collapsed) {
        getExpandedFolders().delete(entry.path)
        if (getSelectedFolder() === entry.path) setSelectedFolder(getVaultRootPath())
      } else {
        getExpandedFolders().add(entry.path)
        setSelectedFolder(entry.path)
      }
      scheduleSaveExpandedFolders()
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
      tabsApi.openFile(entry.path)
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
    const name = pathBasename(entryPath)
    setFolderButtonContent(btn, name, childUl.hidden, entryPath === getSelectedFolder())
  }
}

function refreshActiveHighlight(): void {
  const prev = explorerTree.querySelectorAll('li[data-active="true"]')
  for (const li of prev) li.removeAttribute('data-active')
  const active = tabsApi.activeFilePath()
  if (active) {
    const li = getNodeMap().get(active)
    if (li) li.dataset.active = 'true'
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
      if (getSelectedFolder() === entryPath) {
        setSelectedFolder(getVaultRootPath())
        updateSelectedFolderDisplay()
      }
      await loadExplorer()
    } catch (e) {
      alert((e as Error).message)
    }
  }
}

async function handleRootContextMenu(): Promise<void> {
  if (!getVaultRootPath()) return
  const result = await window.api.vault.contextMenu(getVaultRootPath()!, 'root')
  if (!result) return

  if (result.action === 'new-file') {
    const fileName = await customPrompt('Enter file name:', 'untitled.md')
    if (!fileName) return
    try {
      await window.api.vault.createNote(getVaultRootPath()!, ensureMdExtension(fileName), '')
      await loadExplorer()
    } catch (e) {
      alert((e as Error).message)
    }
  } else if (result.action === 'new-folder') {
    const folderName = await customPrompt('Enter folder name:', 'untitled-folder')
    if (!folderName) return
    try {
      await window.api.vault.createFolder(getVaultRootPath()!, folderName)
      await loadExplorer()
    } catch (e) {
      alert((e as Error).message)
    }
  }
}

async function loadCurrentVault(): Promise<void> {
  const vaultPathEl = getVaultPathEl()
  try {
    const vault = await window.api.vault.getCurrentVault()
    if (vault) {
      setVaultRootPath(vault.rootPath)
      setSelectedFolder(vault.rootPath)
      vaultPathEl.textContent = basename(vault.rootPath)
      vaultPathEl.title = vault.rootPath
      try {
        const folders = await window.api.state.getExpandedFolders()
        getExpandedFolders().clear()
        for (const f of folders) getExpandedFolders().add(f)
      } catch (e) {
        console.warn('Failed to restore expanded folders', (e as Error).message)
      }
      await loadExplorer()
      await tabsApi.restoreTabs()
      try {
        const activePath = await window.api.state.getActiveTabPath()
        if (activePath) {
          const tabs = tabsApi.getTabs()
          for (const [docId, tab] of tabs) {
            if (tab.path === activePath) {
              setActiveDocId(docId)
              break
            }
          }
          tabsApi.loadActiveBuffer()
          tabsApi.updateDocStatus()
          tabsApi.renderTabs()
          refreshActiveHighlight()
          await editorApi.loadBacklinks()
        }
      } catch (e) {
        console.warn('Failed to restore active tab', (e as Error).message)
      }
    } else {
      setVaultRootPath(null)
      setSelectedFolder(null)
      vaultPathEl.textContent = 'No vault selected'
      vaultPathEl.title = ''
      updateSelectedFolderDisplay()
    }
  } catch (e) {
    vaultPathEl.textContent = '[Error: ' + (e as Error).message + ']'
    vaultPathEl.title = ''
  }
}

function hidePanel(): void {
  explorerPanel.hidden = true
}

function showPanel(): void {
  explorerPanel.hidden = false
  window.api.state.setActivePanel(modId).catch(() => {})
}

async function restoreState(): Promise<void> {
  // Panel visibility is managed by ButtonRegistry.setActive() via onActivate/onDeactivate.
}

function buildPanelDom(): void {
  explorerPanel = document.createElement('div')
  explorerPanel.id = 'explorer'
  explorerPanel.hidden = true

  explorerTree = document.createElement('ul')
  explorerTree.id = 'explorer-tree'
  explorerPanel.appendChild(explorerTree)

  const commandBar = document.getElementById('command-bar')
  if (commandBar) {
    commandBar.after(explorerPanel)
  } else {
    document.getElementById('sidebar')?.appendChild(explorerPanel)
  }

  explorerStatus = document.getElementById('explorer-status') as HTMLSpanElement
  selectDirBtn = document.getElementById('select-dir') as HTMLButtonElement
}

export function initExplorer(ctx: ModContext, id: string): ExplorerHandle {
  editorApi = ctx.editorApi
  tabsApi = ctx.tabsApi
  modId = id

  buildPanelDom()

  const watch = initExplorerWatch({
    explorerTree,
    renderEntry,
    refreshActiveHighlight,
    refreshAllMarkers,
    setFolderButtonContent,
    editorApi,
    tabsApi,
  })

  selectDirBtn.addEventListener('click', async () => {
    selectDirBtn.disabled = true
    try {
      const vault = await window.api.vault.openVault()
      if (vault) {
        setVaultRootPath(vault.rootPath)
        setSelectedFolder(vault.rootPath)
        const vaultPathEl = getVaultPathEl()
        vaultPathEl.textContent = basename(vault.rootPath)
        vaultPathEl.title = vault.rootPath
        getExpandedFolders().clear()
        await loadExplorer()
      }
    } catch (e) {
      alert((e as Error).message)
    } finally {
      selectDirBtn.disabled = false
    }
  })

  explorerPanel.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    handleRootContextMenu()
  })

  window.api.vault.onNoteChanged((batch) => {
    watch.handleWatchEvents(batch).catch((e) => console.warn('watch error', (e as Error).message))
  })

  return { showPanel, hidePanel, restoreState, loadExplorer, refreshActiveHighlight, loadCurrentVault }
}

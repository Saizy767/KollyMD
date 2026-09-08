import { pathDirname, pathBasename } from '../utils/path'
import {
  getVaultRootPath,
  getSelectedFolder, setSelectedFolder,
  getExpandedFolders, getNodeMap,
  getActiveDocId,
} from '../state'
import { updateSelectedFolderDisplay } from './sidebar'
import type { EditorApi } from './editor'
import type { TabsApi } from './tabs'

const explorerTree = document.getElementById('explorer-tree') as HTMLUListElement

interface ExplorerWatchDeps {
  renderEntry: (entry: NoteEntryDto) => HTMLLIElement
  refreshActiveHighlight: () => void
  refreshAllMarkers: () => void
  setFolderButtonContent: (btn: HTMLButtonElement, name: string, collapsed: boolean, selected: boolean) => void
  editorApi: EditorApi
  tabsApi: TabsApi
}

let deps: ExplorerWatchDeps

function sortBefore(aIsDir: boolean, aName: string, bIsDir: boolean, bName: string): boolean {
  if (aIsDir !== bIsDir) return aIsDir
  return aName.toLowerCase() < bName.toLowerCase()
}

function insertNode(path: string, isDir: boolean): void {
  if (path === getVaultRootPath()) return
  if (getNodeMap().has(path)) return
  const parentPath = pathDirname(path)
  const parentLi = parentPath ? getNodeMap().get(parentPath) : null
  let parentUl: HTMLUListElement
  if (parentLi) {
    let ul = parentLi.querySelector('ul') as HTMLUListElement | null
    if (!ul) {
      ul = document.createElement('ul')
      ul.hidden = !getExpandedFolders().has(parentPath)
      parentLi.appendChild(ul)
    }
    parentUl = ul
  } else {
    parentUl = explorerTree
  }
  const name = pathBasename(path)
  const entry: NoteEntryDto = { path, name, isDirectory: isDir, children: [] }
  const newLi = deps.renderEntry(entry)
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
  getNodeMap().delete(path)
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
  getNodeMap().delete(oldPath)
  getNodeMap().set(newPath, li)
  const childUl = li.querySelector('ul') as HTMLUListElement | null
  if (childUl) {
    for (const child of Array.from(childUl.children) as HTMLLIElement[]) {
      updateNodePath(child, oldPrefix, newPrefix)
    }
  }
}

function renameDirNode(oldPath: string, newPath: string): void {
  const li = getNodeMap().get(oldPath)
  if (!li) return
  if (getExpandedFolders().has(oldPath)) {
    getExpandedFolders().delete(oldPath)
    getExpandedFolders().add(newPath)
  }
  if (getSelectedFolder() === oldPath) setSelectedFolder(newPath)
  updateNodePath(li, oldPath, newPath)
  const toggle = li.querySelector('button') as HTMLButtonElement | null
  if (toggle) {
    deps.setFolderButtonContent(toggle, pathBasename(newPath), !getExpandedFolders().has(newPath), newPath === getSelectedFolder())
  }
}

async function renameFileNode(oldPath: string, newPath: string): Promise<void> {
  const li = getNodeMap().get(oldPath)
  if (li) {
    li.dataset.path = newPath
    getNodeMap().delete(oldPath)
    getNodeMap().set(newPath, li)
    const span = li.querySelector('span') as HTMLSpanElement | null
    if (span) {
      const name = pathBasename(newPath)
      span.textContent = name.toLowerCase().endsWith('.md') ? name.slice(0, -3) : name
    }
  }
  const tabs = deps.tabsApi.getTabs()
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
  if (getActiveDocId() && tabs.get(getActiveDocId()!)?.path === newPath) {
    deps.tabsApi.updateDocStatus()
    deps.tabsApi.renderTabs()
  }
}

async function handleChange(filePath: string): Promise<void> {
  const id = getActiveDocId()
  if (!id) return
  const tabs = deps.tabsApi.getTabs()
  const tab = tabs.get(id)
  if (!tab || tab.path !== filePath || tab.dirty) return
  try {
    const content = await window.api.vault.readNote(filePath)
    tab.content = content
    if (getActiveDocId() && tabs.get(getActiveDocId()!)?.path === filePath) {
      deps.editorApi.setEditorContent(content)
    }
  } catch (e) {
    console.warn('Failed to reload changed note', (e as Error).message)
  }
}

async function handleUnlink(entryPath: string, isDir: boolean): Promise<void> {
  const wasActive = deps.tabsApi.activeFilePath() === entryPath

  if (isDir) {
    const li = getNodeMap().get(entryPath)
    if (li) {
      removeNodeFromMap(entryPath, li)
      li.remove()
    }
    const sf = getSelectedFolder()
    if (sf && (sf === entryPath || sf.startsWith(entryPath + '/') || sf.startsWith(entryPath + '\\'))) {
      setSelectedFolder(pathDirname(entryPath) || getVaultRootPath())
      updateSelectedFolderDisplay()
      deps.refreshAllMarkers()
    }
    return
  }

  let siblingFile: string | null = null
  if (wasActive) {
    const parentPath = pathDirname(entryPath)
    const parentLi = parentPath ? getNodeMap().get(parentPath) : null
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

  const li = getNodeMap().get(entryPath)
  if (li) {
    removeNodeFromMap(entryPath, li)
    li.remove()
  }

  const tabs = deps.tabsApi.getTabs()
  for (const [docId, tab] of Array.from(tabs)) {
    if (tab.path === entryPath) {
      if (tab.dirty) {
        tab.path = null
        tab.missing = true
        tab.missingName = pathBasename(entryPath)
        if (docId === getActiveDocId()) {
          deps.tabsApi.updateDocStatus()
          deps.tabsApi.renderTabs()
        }
      } else {
        await deps.tabsApi.closeDoc(docId)
      }
    }
  }

  if (wasActive) {
    if (siblingFile) {
      await deps.tabsApi.openFile(siblingFile)
    } else {
      setSelectedFolder(pathDirname(entryPath) || getVaultRootPath())
      updateSelectedFolderDisplay()
      deps.refreshAllMarkers()
    }
  }
}

async function handleWatchEvents(batch: WatchEventDto[]): Promise<void> {
  if (!getVaultRootPath()) return
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

  deps.refreshActiveHighlight()
}

export function initExplorerWatch(d: ExplorerWatchDeps): { handleWatchEvents: (batch: WatchEventDto[]) => Promise<void> } {
  deps = d
  return { handleWatchEvents }
}

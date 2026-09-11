import rightArrowUrl from '../assets/right-arrow.svg'
import bottomArrowUrl from '../assets/bottom-arrow.svg'
import { pathDirname } from '../utils/path'
import type { TabsApi } from './tabs'

interface SearchPanelDeps {
  tabsApi: TabsApi
}

export interface SearchPanelApi {
  render: () => void
  clear: () => void
  getLastQuery: () => string
}

let deps: SearchPanelDeps
let panelEl: HTMLDivElement
let inputEl: HTMLInputElement
let resultsEl: HTMLDivElement
let statusEl: HTMLSpanElement

let lastQuery = ''
const collapsedFolders = new Set<string>()
let saveStateTimer: ReturnType<typeof setTimeout> | null = null
let renderTimer: ReturnType<typeof setTimeout> | null = null
let initialized = false

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightInto(container: HTMLElement, text: string, query: string): void {
  container.replaceChildren()
  if (!query) {
    container.appendChild(document.createTextNode(text))
    return
  }
  const pattern = new RegExp(escapeRegex(query), 'gi')
  let last = 0
  let m: RegExpExecArray | null
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) {
      container.appendChild(document.createTextNode(text.slice(last, m.index)))
    }
    const mark = document.createElement('mark')
    mark.className = 'search-highlight'
    mark.textContent = m[0]
    container.appendChild(mark)
    last = m.index + m[0].length
  }
  if (last < text.length) {
    container.appendChild(document.createTextNode(text.slice(last)))
  }
}

function setToggleIcon(btn: HTMLButtonElement, collapsed: boolean): void {
  const img = btn.querySelector('img.folder-arrow') as HTMLImageElement | null
  if (img) {
    img.src = collapsed ? rightArrowUrl : bottomArrowUrl
    img.alt = collapsed ? 'Expand' : 'Collapse'
  }
}

function scheduleSaveState(): void {
  if (saveStateTimer) clearTimeout(saveStateTimer)
  saveStateTimer = setTimeout(() => {
    window.api.state
      .setSearchPanelState({
        activePanel: 'search',
        expandedSearchFolders: Array.from(collapsedFolders),
        lastSearchQuery: lastQuery,
      })
      .catch(() => {})
  }, 500)
}

function scheduleRender(): void {
  if (renderTimer) clearTimeout(renderTimer)
  renderTimer = setTimeout(() => {
    void doRender()
  }, 200)
}

function render(): void {
  if (renderTimer) clearTimeout(renderTimer)
  void doRender()
}

function clear(): void {
  lastQuery = ''
  inputEl.value = ''
  render()
}

function getLastQuery(): string {
  return lastQuery
}

async function doRender(): Promise<void> {
  resultsEl.replaceChildren()
  if (!lastQuery) {
    await renderHierarchy()
  } else {
    await renderSearchResults()
  }
}

async function renderHierarchy(): Promise<void> {
  let entries: NoteEntryDto[]
  try {
    entries = await window.api.vault.listNotes()
  } catch (e) {
    statusEl.textContent = '[Error: ' + (e as Error).message + ']'
    return
  }
  if (entries.length === 0) {
    statusEl.textContent = 'Vault is empty'
    return
  }
  statusEl.textContent = ''
  resultsEl.appendChild(buildHierarchyTree(entries))
}

function buildHierarchyTree(entries: NoteEntryDto[]): HTMLUListElement {
  const ul = document.createElement('ul')
  ul.className = 'search-panel-tree'
  for (const entry of entries) {
    ul.appendChild(buildHierarchyEntry(entry))
  }
  return ul
}

function buildHierarchyEntry(entry: NoteEntryDto): HTMLLIElement {
  const li = document.createElement('li')
  li.className = 'search-panel-card'
  li.dataset.path = entry.path

  if (entry.isDirectory) {
    const card = document.createElement('div')
    card.className = 'search-panel-folder-card'
    const toggle = document.createElement('button')
    toggle.className = 'search-panel-toggle'
    const img = document.createElement('img')
    img.className = 'folder-arrow'
    const collapsed = collapsedFolders.has(entry.path)
    img.src = collapsed ? rightArrowUrl : bottomArrowUrl
    img.alt = collapsed ? 'Expand' : 'Collapse'
    toggle.appendChild(img)
    const nameSpan = document.createElement('span')
    nameSpan.className = 'search-panel-name'
    nameSpan.textContent = entry.name
    toggle.appendChild(nameSpan)
    card.appendChild(toggle)

    const childUl = buildHierarchyTree(entry.children)
    childUl.hidden = collapsed

    toggle.addEventListener('click', () => {
      const nowCollapsed = !childUl.hidden
      childUl.hidden = nowCollapsed
      if (nowCollapsed) collapsedFolders.add(entry.path)
      else collapsedFolders.delete(entry.path)
      setToggleIcon(toggle, nowCollapsed)
      scheduleSaveState()
    })

    li.appendChild(card)
    li.appendChild(childUl)
  } else {
    const card = document.createElement('div')
    card.className = 'search-panel-file-card'
    const nameSpan = document.createElement('span')
    nameSpan.className = 'search-panel-name'
    const displayName = entry.name.toLowerCase().endsWith('.md')
      ? entry.name.slice(0, -3)
      : entry.name
    nameSpan.textContent = displayName
    card.appendChild(nameSpan)
    card.addEventListener('click', () => {
      void deps.tabsApi.openFile(entry.path)
    })
    li.appendChild(card)
  }

  return li
}

async function renderSearchResults(): Promise<void> {
  let results: SearchEntryDto[]
  try {
    results = await window.api.search.searchEntries(lastQuery)
  } catch (e) {
    statusEl.textContent = '[Error: ' + (e as Error).message + ']'
    return
  }
  if (results.length === 0) {
    statusEl.textContent = 'No results'
    return
  }
  statusEl.textContent = results.length + ' results'
  resultsEl.appendChild(buildResultTree(results))
}

function buildResultTree(results: SearchEntryDto[]): HTMLUListElement {
  const byPath = new Map<string, SearchEntryDto>()
  for (const r of results) byPath.set(r.path, r)

  const childrenByParent = new Map<string, SearchEntryDto[]>()
  const roots: SearchEntryDto[] = []
  for (const r of results) {
    const parent = pathDirname(r.path)
    if (byPath.has(parent)) {
      const arr = childrenByParent.get(parent) ?? []
      arr.push(r)
      childrenByParent.set(parent, arr)
    } else {
      roots.push(r)
    }
  }

  const ul = document.createElement('ul')
  ul.className = 'search-panel-tree'
  for (const r of roots) {
    ul.appendChild(buildResultEntry(r, childrenByParent))
  }
  return ul
}

function buildResultEntry(
  entry: SearchEntryDto,
  childrenByParent: Map<string, SearchEntryDto[]>
): HTMLLIElement {
  const li = document.createElement('li')
  li.className = 'search-panel-card'
  li.dataset.path = entry.path

  if (entry.kind === 'folder') {
    const card = document.createElement('div')
    card.className = 'search-panel-folder-card'
    const toggle = document.createElement('button')
    toggle.className = 'search-panel-toggle'
    const img = document.createElement('img')
    img.className = 'folder-arrow'
    const collapsed = collapsedFolders.has(entry.path)
    img.src = collapsed ? rightArrowUrl : bottomArrowUrl
    img.alt = collapsed ? 'Expand' : 'Collapse'
    toggle.appendChild(img)
    const nameSpan = document.createElement('span')
    nameSpan.className = 'search-panel-name'
    highlightInto(nameSpan, entry.name, lastQuery)
    toggle.appendChild(nameSpan)
    card.appendChild(toggle)

    const children = childrenByParent.get(entry.path) ?? []
    const childUl = document.createElement('ul')
    childUl.className = 'search-panel-tree'
    childUl.hidden = collapsed
    for (const child of children) {
      childUl.appendChild(buildResultEntry(child, childrenByParent))
    }

    toggle.addEventListener('click', () => {
      const nowCollapsed = !childUl.hidden
      childUl.hidden = nowCollapsed
      if (nowCollapsed) collapsedFolders.add(entry.path)
      else collapsedFolders.delete(entry.path)
      setToggleIcon(toggle, nowCollapsed)
      scheduleSaveState()
    })

    li.appendChild(card)
    if (children.length > 0) li.appendChild(childUl)
  } else {
    const card = document.createElement('div')
    card.className = 'search-panel-file-card'
    const nameSpan = document.createElement('span')
    nameSpan.className = 'search-panel-name'
    const displayName = entry.name.toLowerCase().endsWith('.md')
      ? entry.name.slice(0, -3)
      : entry.name
    highlightInto(nameSpan, displayName, lastQuery)
    card.appendChild(nameSpan)

    if (entry.snippet) {
      const snippetDiv = document.createElement('div')
      snippetDiv.className = 'search-panel-snippet'
      highlightInto(snippetDiv, entry.snippet, lastQuery)
      card.appendChild(snippetDiv)
    }

    card.addEventListener('click', () => {
      void deps.tabsApi.openFile(entry.path)
    })
    li.appendChild(card)
  }

  return li
}

function buildPanelDom(): void {
  panelEl = document.createElement('div')
  panelEl.id = 'search-panel'
  panelEl.hidden = true

  inputEl = document.createElement('input')
  inputEl.id = 'search-panel-input'
  inputEl.type = 'text'
  inputEl.placeholder = 'Search files and folders...'

  statusEl = document.createElement('span')
  statusEl.className = 'search-panel-status'

  resultsEl = document.createElement('div')
  resultsEl.id = 'search-panel-results'

  panelEl.appendChild(inputEl)
  panelEl.appendChild(statusEl)
  panelEl.appendChild(resultsEl)

  const sidebar = document.getElementById('sidebar')
  const footer = document.getElementById('sidebar-footer')
  if (sidebar && footer) {
    sidebar.insertBefore(panelEl, footer)
  } else if (sidebar) {
    sidebar.appendChild(panelEl)
  }

  inputEl.addEventListener('input', () => {
    lastQuery = inputEl.value
    scheduleSaveState()
    scheduleRender()
  })
}

export function initSearchPanel(d: SearchPanelDeps): SearchPanelApi {
  if (initialized) return { render, clear, getLastQuery }
  initialized = true
  deps = d

  buildPanelDom()

  window.api.state
    .getSearchPanelState()
    .then((state) => {
      collapsedFolders.clear()
      for (const f of state.expandedSearchFolders) collapsedFolders.add(f)
      lastQuery = state.lastSearchQuery
      inputEl.value = lastQuery
      render()
    })
    .catch(() => {
      render()
    })

  return { render, clear, getLastQuery }
}

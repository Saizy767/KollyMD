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
    statusEl.textContent = ''
    return
  }
  await renderSearchResults()
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

  let entries: NoteEntryDto[] = []
  try {
    entries = await window.api.vault.listNotes()
  } catch {
    // vault unavailable — folder expansion falls back to search-only children
  }
  const entryByPath = new Map<string, NoteEntryDto>()
  populateEntryByPath(entries, entryByPath)

  resultsEl.appendChild(buildResultTree(results, entryByPath))
}

function populateEntryByPath(entries: NoteEntryDto[], map: Map<string, NoteEntryDto>): void {
  for (const entry of entries) {
    map.set(entry.path, entry)
    if (entry.children.length > 0) {
      populateEntryByPath(entry.children, map)
    }
  }
}

function buildResultTree(
  results: SearchEntryDto[],
  entryByPath: Map<string, NoteEntryDto>
): HTMLUListElement {
  const searchByPath = new Map<string, SearchEntryDto>()
  for (const r of results) searchByPath.set(r.path, r)

  const roots: SearchEntryDto[] = []
  for (const r of results) {
    const parent = pathDirname(r.path)
    if (!searchByPath.has(parent)) {
      roots.push(r)
    }
  }

  const ul = document.createElement('ul')
  ul.className = 'search-panel-tree'
  for (const r of roots) {
    ul.appendChild(
      buildEntryNode(r.path, r.name, r.kind === 'folder', searchByPath, entryByPath)
    )
  }
  return ul
}

function buildEntryNode(
  path: string,
  name: string,
  isDir: boolean,
  searchByPath: Map<string, SearchEntryDto>,
  entryByPath: Map<string, NoteEntryDto>
): HTMLLIElement {
  const li = document.createElement('li')
  li.className = 'search-panel-card'
  li.dataset.path = path

  const searchEntry = searchByPath.get(path)
  const highlightQuery = searchEntry ? lastQuery : ''

  if (isDir) {
    const card = document.createElement('div')
    card.className = 'search-panel-folder-card'
    const toggle = document.createElement('button')
    toggle.className = 'search-panel-toggle'
    const img = document.createElement('img')
    img.className = 'folder-arrow'
    const collapsed = collapsedFolders.has(path)
    img.src = collapsed ? rightArrowUrl : bottomArrowUrl
    img.alt = collapsed ? 'Expand' : 'Collapse'
    toggle.appendChild(img)
    const nameSpan = document.createElement('span')
    nameSpan.className = 'search-panel-name'
    highlightInto(nameSpan, name, highlightQuery)
    toggle.appendChild(nameSpan)
    card.appendChild(toggle)

    const vaultEntry = entryByPath.get(path)
    const children = vaultEntry?.children ?? []
    const childUl = document.createElement('ul')
    childUl.className = 'search-panel-tree'
    childUl.hidden = collapsed
    for (const child of children) {
      childUl.appendChild(
        buildEntryNode(child.path, child.name, child.isDirectory, searchByPath, entryByPath)
      )
    }

    toggle.addEventListener('click', () => {
      const nowCollapsed = !childUl.hidden
      childUl.hidden = nowCollapsed
      if (nowCollapsed) collapsedFolders.add(path)
      else collapsedFolders.delete(path)
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
    const displayName = name.toLowerCase().endsWith('.md') ? name.slice(0, -3) : name
    highlightInto(nameSpan, displayName, highlightQuery)
    card.appendChild(nameSpan)

    if (searchEntry?.snippet) {
      const snippetDiv = document.createElement('div')
      snippetDiv.className = 'search-panel-snippet'
      highlightInto(snippetDiv, searchEntry.snippet, lastQuery)
      card.appendChild(snippetDiv)
    }

    card.addEventListener('click', () => {
      void deps.tabsApi.openFile(path)
    })
    li.appendChild(card)
  }

  return li
}

function buildPanelDom(): void {
  panelEl = document.getElementById('search-panel') as HTMLDivElement
  panelEl.replaceChildren()

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
      render()
    })
    .catch(() => {
      render()
    })

  return { render, clear, getLastQuery }
}

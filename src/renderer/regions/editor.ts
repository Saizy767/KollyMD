import { createEditorView } from '../editor/cm-setup'
import type { EditorView } from '@codemirror/view'
import { docName } from '../utils/path'
import type { TabState } from './tabs'

const editorHost = document.getElementById('editor-host') as HTMLDivElement
const backlinksList = document.getElementById('backlinks') as HTMLUListElement

let editorView!: EditorView
let suppressChange = false

interface EditorDeps {
  getActiveTab: () => TabState | null
  setDirty: (value: boolean) => Promise<void>
  openFile: (path: string) => Promise<void>
  loadExplorer: () => Promise<void>
}

let deps: EditorDeps

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
  const tab = deps.getActiveTab()
  if (tab) {
    tab.content = doc
    if (!tab.dirty) deps.setDirty(true)
  }
}

function noteNameFromPath(filePath: string): string {
  const bn = docName(filePath)
  return bn.toLowerCase().endsWith('.md') ? bn.slice(0, -3) : bn
}

async function loadBacklinks(): Promise<void> {
  const tab = deps.getActiveTab()
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
          deps.openFile(bl.sourcePath)
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
      await deps.openFile(resolved.path)
    } else {
      const confirmed = confirm("Create note '" + name + "'?")
      if (confirmed) {
        const result = await window.api.knowledge.createNoteFromLink(name)
        await deps.loadExplorer()
        await deps.openFile(result.path)
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

export interface EditorApi {
  getEditorContent: () => string
  setEditorContent: (content: string) => void
  loadBacklinks: () => Promise<void>
}

export function initEditor(d: EditorDeps): EditorApi {
  deps = d
  editorView = createEditorView(editorHost, '', onEditorContentChange)

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

  return { getEditorContent, setEditorContent, loadBacklinks }
}

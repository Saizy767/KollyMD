import type { EditorView } from '@codemirror/view'

export class ImageInsertError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageInsertError'
  }
}

const SUPPORTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp']

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
}

function isImageFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return SUPPORTED_EXTENSIONS.includes(ext)
}

function generatePasteName(mime: string): string {
  const ext = MIME_TO_EXT[mime] ?? 'png'
  const d = new Date()
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const time = `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`
  return `paste_${date}_${time}.${ext}`
}

async function saveAndCollect(file: File): Promise<string | null> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await window.api.vault.saveImage(file.name, arrayBuffer)
  return result.savedFileName
}

function insertEmbeds(view: EditorView, names: string[]): void {
  if (names.length === 0) return
  const text = names.map(n => `![[${n}]]`).join('\n')
  const pos = view.state.selection.main.head
  view.dispatch({ changes: { from: pos, insert: text } })
}

async function handleDrop(view: EditorView, e: DragEvent): Promise<void> {
  e.preventDefault()
  e.stopPropagation()
  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return

  const imageFiles = Array.from(files).filter(f => isImageFile(f.name))
  if (imageFiles.length === 0) return

  const names: string[] = []
  for (const file of imageFiles) {
    try {
      const name = await saveAndCollect(file)
      if (name) names.push(name)
    } catch (err) {
      alert(`Failed to save image "${file.name}": ${(err as Error).message}`)
    }
  }
  insertEmbeds(view, names)
}

async function handlePaste(view: EditorView, e: ClipboardEvent): Promise<void> {
  const items = e.clipboardData?.items
  if (!items || items.length === 0) return

  const imageFiles: File[] = []
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) imageFiles.push(file)
    }
  }
  if (imageFiles.length === 0) return

  e.preventDefault()

  const names: string[] = []
  for (const file of imageFiles) {
    const named = new File([file], generatePasteName(file.type), { type: file.type })
    try {
      const name = await saveAndCollect(named)
      if (name) names.push(name)
    } catch (err) {
      alert(`Failed to save pasted image: ${(err as Error).message}`)
    }
  }
  insertEmbeds(view, names)
}

export function attachImageHandlers(view: EditorView, host: HTMLElement): () => void {
  const onDragOver = (e: DragEvent): void => {
    e.preventDefault()
  }
  const onDrop = (e: DragEvent): void => {
    void handleDrop(view, e)
  }
  const onPaste = (e: ClipboardEvent): void => {
    void handlePaste(view, e)
  }

  host.addEventListener('dragover', onDragOver)
  host.addEventListener('drop', onDrop)
  host.addEventListener('paste', onPaste)

  return (): void => {
    host.removeEventListener('dragover', onDragOver)
    host.removeEventListener('drop', onDrop)
    host.removeEventListener('paste', onPaste)
  }
}

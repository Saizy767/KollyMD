import { ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import type { EditorView } from '@codemirror/view'
import type { Range } from '@codemirror/state'
import { getVaultRootPath } from '../state'

class HrWidget extends WidgetType {
  toDOM(): HTMLElement {
    const hr = document.createElement('hr')
    hr.className = 'cm-hr-widget'
    return hr
  }
  eq(): boolean { return true }
  ignoreEvent(): boolean { return true }
}

class ImageWidget extends WidgetType {
  constructor(
    readonly fileName: string,
    readonly mode: 'block' | 'inline',
    readonly width: number | null
  ) {
    super()
  }

  toDOM(): HTMLElement {
    const img = document.createElement('img')
    img.className = this.mode === 'block' ? 'image-block' : 'image-inline'
    img.alt = this.fileName
    if (this.width !== null) {
      img.setAttribute('width', String(this.width))
    }
    const root = getVaultRootPath()
    const fullPath = root ? root + '/' + this.fileName : ''
    if (fullPath) {
      window.api.vault.readImage(fullPath).then(dataUrl => {
        img.src = dataUrl
      }).catch(() => {})
    }
    return img
  }

  eq(other: WidgetType): boolean {
    return other instanceof ImageWidget &&
      this.fileName === other.fileName &&
      this.mode === other.mode &&
      this.width === other.width
  }

  ignoreEvent(): boolean { return true }
}

const HEADING_MAP: Record<string, string> = {
  ATXHeading1: 'cm-h1',
  ATXHeading2: 'cm-h2',
  ATXHeading3: 'cm-h3',
  ATXHeading4: 'cm-h4',
  ATXHeading5: 'cm-h5',
  ATXHeading6: 'cm-h6',
  SetextHeading1: 'cm-h1',
  SetextHeading2: 'cm-h2'
}

const STYLE_MAP: Record<string, string> = {
  ...HEADING_MAP,
  StrongEmphasis: 'cm-strong',
  Emphasis: 'cm-em',
  InlineCode: 'cm-code-inline',
  FencedCode: 'cm-code-block',
  CodeBlock: 'cm-code-block',
  Blockquote: 'cm-blockquote',
  Link: 'cm-link',
  Autolink: 'cm-link'
}

const HEADING_PREFIX_RE = /^#{1,6}\s/

const TAG_RE = /(?:^|\s)#([a-zA-Zа-яА-Я0-9_-]+)/gm

const EMBED_RE = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

const HIDE_NAMES = new Set([
  'EmphasisMark',
  'CodeMark',
  'LinkMark',
  'QuoteMark',
  'LinkLabel'
])

const URL_HIDDEN_PARENTS = new Set(['Link', 'Image'])

function buildDecorations(view: EditorView): DecorationSet {
  const decos: Range<Decoration>[] = []

  const sel = view.state.selection.main
  const cursorLineStart = view.state.doc.lineAt(sel.from).from
  const cursorLineEnd = view.state.doc.lineAt(sel.to).to

  function onCursorLine(from: number, to: number): boolean {
    const lineStart = view.state.doc.lineAt(from).from
    const lineEnd = view.state.doc.lineAt(to).to
    return lineStart <= cursorLineEnd && lineEnd >= cursorLineStart
  }

  syntaxTree(view.state).iterate({
    enter(node) {
      if (onCursorLine(node.from, node.to)) return

      if (node.name === 'HeaderMark') {
        const lineStart = view.state.doc.lineAt(node.from).from
        if (
          node.from === lineStart &&
          view.state.doc.sliceString(node.from, node.from + 1) === '#'
        ) {
          return
        }
        decos.push(Decoration.replace({}).range(node.from, node.to))
        return
      }

      if (node.name === 'URL') {
        if (URL_HIDDEN_PARENTS.has(node.node.parent?.name ?? '')) {
          decos.push(Decoration.replace({}).range(node.from, node.to))
        } else {
          decos.push(Decoration.mark({ class: 'cm-link' }).range(node.from, node.to))
        }
        return
      }

      if (HIDE_NAMES.has(node.name)) {
        decos.push(Decoration.replace({}).range(node.from, node.to))
        return
      }

      if (node.name === 'HorizontalRule') {
        decos.push(Decoration.replace({ widget: new HrWidget() }).range(node.from, node.to))
        return
      }

      const cls = STYLE_MAP[node.name]
      if (cls) {
        decos.push(Decoration.mark({ class: cls }).range(node.from, node.to))
      }
    }
  })

  for (const { from, to } of view.visibleRanges) {
    const startLine = view.state.doc.lineAt(from)
    const endLine = view.state.doc.lineAt(to)
    for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
      const line = view.state.doc.line(lineNum)
      const m = HEADING_PREFIX_RE.exec(line.text)
      if (m) {
        const prefixFrom = line.from
        const prefixTo = line.from + m[0].length
        if (prefixFrom > cursorLineEnd || prefixTo < cursorLineStart) {
          decos.push(Decoration.replace({}).range(prefixFrom, prefixTo))
        }
      }
    }
  }

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to)
    TAG_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = TAG_RE.exec(text)) !== null) {
      const prefixLen = m[0].length - m[1].length - 1
      const tagFrom = from + m.index + prefixLen
      const tagTo = tagFrom + m[1].length + 1
      if (tagFrom > cursorLineEnd || tagTo < cursorLineStart) {
        decos.push(Decoration.mark({ class: 'tag' }).range(tagFrom, tagTo))
      }
    }
  }

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to)
    EMBED_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = EMBED_RE.exec(text)) !== null) {
      const start = from + m.index
      const end = start + m[0].length
      if (start > cursorLineEnd || end < cursorLineStart) {
        const fileName = m[1].trim()
        const modifier = m[2]?.trim() ?? ''
        let mode: 'block' | 'inline' = 'block'
        let width: number | null = null
        if (modifier === 'inline') {
          mode = 'inline'
        } else if (/^\d+$/.test(modifier)) {
          mode = 'inline'
          width = parseInt(modifier, 10)
        }
        decos.push(
          Decoration.replace({ widget: new ImageWidget(fileName, mode, width) }).range(start, end)
        )
      }
    }
  }

  return Decoration.set(decos, true)
}

class LivePreviewPlugin {
  decorations: DecorationSet

  constructor(view: EditorView) {
    this.decorations = buildDecorations(view)
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.selectionSet || update.viewportChanged) {
      this.decorations = buildDecorations(update.view)
    }
  }
}

export const livePreview = ViewPlugin.fromClass(LivePreviewPlugin, {
  decorations: v => v.decorations
})

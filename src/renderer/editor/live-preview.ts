import { ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import type { EditorView } from '@codemirror/view'
import type { Range } from '@codemirror/state'

class HrWidget extends WidgetType {
  toDOM(): HTMLElement {
    const hr = document.createElement('hr')
    hr.className = 'cm-hr-widget'
    return hr
  }
  eq(): boolean { return true }
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
  Link: 'cm-link'
}

const HIDE_NAMES = new Set([
  'HeaderMark',
  'EmphasisMark',
  'CodeMark',
  'LinkMark',
  'QuoteMark',
  'URL',
  'LinkLabel'
])

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

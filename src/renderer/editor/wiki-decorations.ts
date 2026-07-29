import { ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view'
import type { EditorView } from '@codemirror/view'
import type { Range } from '@codemirror/state'

const WIKI_RE = /\[\[([^\]]+)\]\]/g
const TAG_RE = /(?:^|\s)#(\w+)/gm

class WikiLinkWidget extends WidgetType {
  constructor(readonly name: string) {
    super()
  }
  toDOM(): HTMLElement {
    const a = document.createElement('a')
    a.className = 'cm-wikilink'
    a.dataset.wiki = this.name
    a.textContent = this.name
    return a
  }
  eq(other: WidgetType): boolean {
    return other instanceof WikiLinkWidget && this.name === other.name
  }
  ignoreEvent(): boolean {
    return true
  }
}

class TagWidget extends WidgetType {
  constructor(readonly name: string) {
    super()
  }
  toDOM(): HTMLElement {
    const a = document.createElement('a')
    a.className = 'cm-tag'
    a.dataset.tag = this.name
    a.textContent = '#' + this.name
    return a
  }
  eq(other: WidgetType): boolean {
    return other instanceof TagWidget && this.name === other.name
  }
  ignoreEvent(): boolean {
    return true
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  const decos: Range<Decoration>[] = []

  const sel = view.state.selection.main
  const cursorLineStart = view.state.doc.lineAt(sel.from).from
  const cursorLineEnd = view.state.doc.lineAt(sel.to).to

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to)

    let m: RegExpExecArray | null

    WIKI_RE.lastIndex = 0
    while ((m = WIKI_RE.exec(text)) !== null) {
      const start = from + m.index
      const end = start + m[0].length
      if (start > cursorLineEnd || end < cursorLineStart) {
        decos.push(
          Decoration.replace({ widget: new WikiLinkWidget(m[1].trim()) }).range(start, end)
        )
      }
    }

    TAG_RE.lastIndex = 0
    while ((m = TAG_RE.exec(text)) !== null) {
      const hashPos = m.index + m[0].length - m[1].length - 1
      const start = from + hashPos
      const end = start + m[1].length + 1
      if (start > cursorLineEnd || end < cursorLineStart) {
        decos.push(Decoration.replace({ widget: new TagWidget(m[1]) }).range(start, end))
      }
    }
  }

  return Decoration.set(decos, true)
}

class WikiDecorationsPlugin {
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

export const wikiDecorations = ViewPlugin.fromClass(WikiDecorationsPlugin, {
  decorations: v => v.decorations
})

import { ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view'
import type { EditorView } from '@codemirror/view'
import type { Range } from '@codemirror/state'
import katex from 'katex'

const MATH_RE = /\$\$([\s\S]+?)\$\$|\$([^\$\n]+?)\$/g

function renderKatex(latex: string, displayMode: boolean): string {
  const originalWarn = console.warn
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].startsWith('No character metrics')) return
    originalWarn.apply(console, args)
  }
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false, strict: false })
  } finally {
    console.warn = originalWarn
  }
}

class MathWidget extends WidgetType {
  constructor(readonly latex: string, readonly displayMode: boolean) {
    super()
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = this.displayMode ? 'cm-math cm-math-block' : 'cm-math cm-math-inline'
    try {
      span.innerHTML = renderKatex(this.latex, this.displayMode)
    } catch {
      span.textContent = this.latex
      span.classList.add('cm-math-error')
    }
    return span
  }

  eq(other: WidgetType): boolean {
    return (
      other instanceof MathWidget &&
      this.latex === other.latex &&
      this.displayMode === other.displayMode
    )
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
    MATH_RE.lastIndex = 0
    while ((m = MATH_RE.exec(text)) !== null) {
      const isBlock = m[1] !== undefined
      const latex = isBlock ? m[1] : m[2]
      const start = from + m.index
      const end = start + m[0].length

      if (start > cursorLineEnd || end < cursorLineStart) {
        decos.push(
          Decoration.replace({ widget: new MathWidget(latex, isBlock) }).range(start, end)
        )
      }
    }
  }

  return Decoration.set(decos, true)
}

class MathDecorationsPlugin {
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

export const mathDecorations = ViewPlugin.fromClass(MathDecorationsPlugin, {
  decorations: v => v.decorations
})

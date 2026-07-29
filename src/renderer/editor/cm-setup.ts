import { EditorState } from '@codemirror/state'
import { EditorView, keymap, drawSelection, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import 'katex/dist/katex.min.css'
import { livePreview } from './live-preview'
import { wikiDecorations } from './wiki-decorations'
import { mathDecorations } from './math-decorations'

export function createEditorView(
  host: HTMLElement,
  initialDoc: string,
  onDocChange: (doc: string) => void
): EditorView {
  return new EditorView({
    state: EditorState.create({
      doc: initialDoc,
      extensions: [
        history(),
        drawSelection(),
        highlightActiveLine(),
        bracketMatching(),
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(defaultHighlightStyle),
        oneDark,
        EditorView.lineWrapping,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        livePreview,
        wikiDecorations,
        mathDecorations,
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            onDocChange(update.state.doc.toString())
          }
        })
      ]
    }),
    parent: host
  })
}

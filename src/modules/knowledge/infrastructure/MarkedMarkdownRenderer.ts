import { marked } from 'marked'
import type { MarkdownRenderer } from '../domain/interfaces/MarkdownRenderer'

const wikiLinkExtension = {
  name: 'wikilink',
  level: 'inline' as const,
  start(src: string): number | undefined {
    const idx = src.indexOf('[[')
    return idx >= 0 ? idx : undefined
  },
  tokenizer(src: string): { type: string; raw: string; name: string } | undefined {
    const match = /^\[\[([^\]]+)\]\]/.exec(src)
    if (match) {
      return { type: 'wikilink', raw: match[0], name: match[1].trim() }
    }
    return undefined
  },
  renderer(token: { name: string }): string {
    return `<a data-wiki="${escapeAttr(token.name)}">${escapeText(token.name)}</a>`
  }
}

const tagExtension = {
  name: 'tag',
  level: 'inline' as const,
  start(src: string): number | undefined {
    const match = /(^|\s)#(\w+)/.exec(src)
    if (match) {
      return match.index + (match[1] ? match[1].length : 0)
    }
    return undefined
  },
  tokenizer(src: string): { type: string; raw: string; name: string } | undefined {
    const match = /(^|\s)#(\w+)/.exec(src)
    if (match) {
      const tagName = match[2]
      return {
        type: 'tag',
        raw: match[0],
        name: tagName
      }
    }
    return undefined
  },
  renderer(token: { name: string }): string {
    return `<a data-tag="${escapeAttr(token.name)}">#${escapeText(token.name)}</a>`
  }
}

marked.use({ extensions: [wikiLinkExtension, tagExtension] })

export class MarkedMarkdownRenderer implements MarkdownRenderer {
  render(content: string): string {
    return marked.parse(content) as string
  }
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

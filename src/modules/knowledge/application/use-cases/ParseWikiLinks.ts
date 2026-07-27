import { WikiLink } from '../../domain/entities/WikiLink'

const WIKI_LINK_RE = /\[\[([^\]]+)\]\]/g

export class ParseWikiLinks {
  execute(content: string): WikiLink[] {
    const links: WikiLink[] = []
    let match: RegExpExecArray | null
    while ((match = WIKI_LINK_RE.exec(content)) !== null) {
      links.push(new WikiLink(match[1].trim()))
    }
    return links
  }
}

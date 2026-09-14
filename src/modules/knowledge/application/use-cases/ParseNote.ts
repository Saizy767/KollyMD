import { NoteMetadata } from '@knowledge/domain/entities/NoteMetadata'

const EMBED_RE = /!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g

export class ParseNote {
  execute(content: string): NoteMetadata {
    return new NoteMetadata(this.extractEmbeddedImages(content))
  }

  extractEmbeddedImages(content: string): string[] {
    const images: string[] = []
    let match: RegExpExecArray | null
    EMBED_RE.lastIndex = 0
    while ((match = EMBED_RE.exec(content)) !== null) {
      const name = match[1].trim().toLowerCase()
      if (name && !images.includes(name)) {
        images.push(name)
      }
    }
    return images
  }
}

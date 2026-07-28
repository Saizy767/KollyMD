import type { VaultRepository, NoteRepository } from '../../../vault'
import { VaultNotOpenError } from '../../../vault'
import type { SearchResultDto } from '../dto'

const CONTEXT = 40

function basename(filePath: string): string {
  const idx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  return idx >= 0 ? filePath.slice(idx + 1) : filePath
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildSnippet(content: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - CONTEXT)
  const end = Math.min(content.length, matchIndex + matchLength + CONTEXT)
  let snippet = content.slice(start, end)
  snippet = snippet.replace(/\n/g, ' ')
  const relMatchStart = matchIndex - start
  const before = snippet.slice(0, relMatchStart)
  const match = snippet.slice(relMatchStart, relMatchStart + matchLength)
  const after = snippet.slice(relMatchStart + matchLength)
  let result = ''
  if (start > 0) result += '...'
  result += before + '>>' + match + '<<' + after
  if (end < content.length) result += '...'
  return result
}

export class SearchNotes {
  constructor(
    private readonly vaultRepo: VaultRepository,
    private readonly noteRepo: NoteRepository
  ) {}

  execute(query: string): SearchResultDto[] {
    const vault = this.vaultRepo.getCurrent()
    if (!vault) {
      throw new VaultNotOpenError()
    }
    if (!query || query.trim().length === 0) {
      return []
    }

    const notes = this.noteRepo.readAllNotes(vault.rootPath)
    const pattern = new RegExp(escapeRegex(query), 'gi')
    const results: SearchResultDto[] = []

    for (const note of notes) {
      const name = basename(note.path)
      let matchCount = 0
      let firstContentMatch: { index: number; length: number } | null = null

      pattern.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = pattern.exec(note.content)) !== null) {
        matchCount++
        if (!firstContentMatch) {
          firstContentMatch = { index: m.index, length: m[0].length }
        }
      }

      pattern.lastIndex = 0
      if (pattern.exec(name)) {
        matchCount++
      }

      if (matchCount === 0) continue

      let snippet: string
      if (firstContentMatch) {
        snippet = buildSnippet(note.content, firstContentMatch.index, firstContentMatch.length)
      } else {
        snippet = '[name match]'
      }

      results.push({ path: note.path, name, snippet, matchCount })
    }

    results.sort((a, b) => b.matchCount - a.matchCount)
    return results
  }
}

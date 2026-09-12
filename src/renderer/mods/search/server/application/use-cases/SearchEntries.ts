import type { VaultRepository, NoteRepository } from '../../../../../../modules/vault'
import { VaultNotOpenError } from '../../../../../../modules/vault'
import type { SearchEntryDto } from '../dto'

const SNIPPET_RADIUS = 300

function basename(filePath: string): string {
  const idx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  return idx >= 0 ? filePath.slice(idx + 1) : filePath
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildSnippet(content: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - SNIPPET_RADIUS)
  const end = Math.min(content.length, matchIndex + matchLength + SNIPPET_RADIUS)
  return content.slice(start, end)
}

export class SearchEntries {
  constructor(
    private readonly vaultRepo: VaultRepository,
    private readonly noteRepo: NoteRepository
  ) {}

  execute(input: { query: string }): SearchEntryDto[] {
    const vault = this.vaultRepo.getCurrent()
    if (!vault) {
      throw new VaultNotOpenError()
    }

    const query = input.query.trim().toLowerCase()
    if (query.length === 0) {
      return []
    }

    const notes = this.noteRepo.readAllNotes(vault.rootPath)
    const folders = this.noteRepo.listFolders(vault.rootPath)
    const results: SearchEntryDto[] = []

    for (const folder of folders) {
      if (folder.name.toLowerCase().includes(query)) {
        results.push({
          path: folder.path,
          name: folder.name,
          kind: 'folder',
          snippet: null,
          matchCount: 1
        })
      }
    }

    const pattern = new RegExp(escapeRegex(query), 'gi')

    for (const note of notes) {
      const name = basename(note.path)

      if (name.toLowerCase().includes(query)) {
        results.push({
          path: note.path,
          name,
          kind: 'file',
          snippet: null,
          matchCount: 1
        })
        continue
      }

      let matchCount = 0
      let firstMatch: { index: number; length: number } | null = null
      pattern.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = pattern.exec(note.content)) !== null) {
        matchCount++
        if (!firstMatch) {
          firstMatch = { index: m.index, length: m[0].length }
        }
      }

      if (matchCount === 0) continue

      const snippet = buildSnippet(note.content, firstMatch!.index, firstMatch!.length)
      results.push({
        path: note.path,
        name,
        kind: 'file',
        snippet,
        matchCount
      })
    }

    results.sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === 'folder' ? -1 : 1
      }
      if (a.kind === 'folder') {
        return a.name.localeCompare(b.name)
      }
      return b.matchCount - a.matchCount
    })

    return results
  }
}

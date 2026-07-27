import type { VaultRepository, NoteRepository } from '../../../vault'
import { VaultNotOpenError } from '../../../vault'
import type { BacklinkDto } from '../dto'
import { ParseWikiLinks } from './ParseWikiLinks'

function basename(filePath: string): string {
  const idx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  return idx >= 0 ? filePath.slice(idx + 1) : filePath
}

export class FindBacklinks {
  constructor(
    private readonly vaultRepo: VaultRepository,
    private readonly noteRepo: NoteRepository
  ) {}

  execute(noteName: string): BacklinkDto[] {
    const vault = this.vaultRepo.getCurrent()
    if (!vault) {
      throw new VaultNotOpenError()
    }

    const notes = this.noteRepo.readAllNotes(vault.rootPath)
    const parser = new ParseWikiLinks()
    const target = noteName.toLowerCase()
    const result: BacklinkDto[] = []

    for (const note of notes) {
      const links = parser.execute(note.content)
      for (const link of links) {
        if (link.target.toLowerCase() === target) {
          result.push({
            sourcePath: note.path,
            sourceName: basename(note.path)
          })
          break
        }
      }
    }

    return result
  }
}

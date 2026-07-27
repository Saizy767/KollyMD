import type { VaultRepository, NoteRepository } from '../../../vault'
import { VaultNotOpenError } from '../../../vault'
import type { NoteRefDto } from '../dto'

const TAG_RE = /#(\w+)/g

function basename(filePath: string): string {
  const idx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  return idx >= 0 ? filePath.slice(idx + 1) : filePath
}

export class FindNotesByTag {
  constructor(
    private readonly vaultRepo: VaultRepository,
    private readonly noteRepo: NoteRepository
  ) {}

  execute(tag: string): NoteRefDto[] {
    const vault = this.vaultRepo.getCurrent()
    if (!vault) {
      throw new VaultNotOpenError()
    }

    const notes = this.noteRepo.readAllNotes(vault.rootPath)
    const target = tag.toLowerCase()
    const result: NoteRefDto[] = []

    for (const note of notes) {
      let match: RegExpExecArray | null
      TAG_RE.lastIndex = 0
      while ((match = TAG_RE.exec(note.content)) !== null) {
        if (match[1].toLowerCase() === target) {
          result.push({
            path: note.path,
            name: basename(note.path)
          })
          break
        }
      }
    }

    return result
  }
}

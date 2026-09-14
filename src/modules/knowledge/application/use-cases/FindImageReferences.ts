import type { VaultRepository, NoteRepository } from '@vault'
import { VaultNotOpenError } from '@vault'
import type { NoteRefDto } from '../dto'
import { ParseNote } from './ParseNote'

function basename(filePath: string): string {
  const idx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  return idx >= 0 ? filePath.slice(idx + 1) : filePath
}

export class FindImageReferences {
  constructor(
    private readonly vaultRepo: VaultRepository,
    private readonly noteRepo: NoteRepository
  ) {}

  execute(imageName: string): NoteRefDto[] {
    const vault = this.vaultRepo.getCurrent()
    if (!vault) {
      throw new VaultNotOpenError()
    }

    const notes = this.noteRepo.readAllNotes(vault.rootPath)
    const parser = new ParseNote()
    const target = imageName.trim().toLowerCase()
    const result: NoteRefDto[] = []

    for (const note of notes) {
      const metadata = parser.execute(note.content)
      if (metadata.embeddedImages.includes(target)) {
        result.push({ path: note.path, name: basename(note.path) })
      }
    }

    return result
  }
}

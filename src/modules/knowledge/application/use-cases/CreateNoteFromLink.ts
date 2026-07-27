import type { VaultRepository, NoteRepository } from '../../../vault'
import { VaultNotOpenError } from '../../../vault'
import type { CreatedNoteFromLinkDto } from '../dto'

export class CreateNoteFromLink {
  constructor(
    private readonly vaultRepo: VaultRepository,
    private readonly noteRepo: NoteRepository
  ) {}

  execute(noteName: string): CreatedNoteFromLinkDto {
    const vault = this.vaultRepo.getCurrent()
    if (!vault) {
      throw new VaultNotOpenError()
    }

    const existing = this.noteRepo.findByNoteName(vault.rootPath, noteName)
    if (existing) {
      return { path: existing }
    }

    const path = this.noteRepo.createNote(vault.rootPath, noteName + '.md', '')
    return { path }
  }
}

import type { VaultRepository } from '../../domain/interfaces/VaultRepository'
import type { NoteRepository } from '../../domain/interfaces/NoteRepository'
import { VaultNotOpenError } from '../../domain/errors/VaultErrors'
import type { CreatedNoteDto } from '../dto'

export class CreateNote {
  constructor(
    private readonly vaultRepo: VaultRepository,
    private readonly noteRepo: NoteRepository
  ) {}

  execute(folderPath: string, baseName: string, content: string): CreatedNoteDto {
    const vault = this.vaultRepo.getCurrent()
    if (!vault) {
      throw new VaultNotOpenError()
    }

    const path = this.noteRepo.createNote(folderPath, baseName, content)
    return { path }
  }
}

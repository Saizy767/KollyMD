import type { VaultRepository } from '../../domain/interfaces/VaultRepository'
import type { NoteRepository } from '../../domain/interfaces/NoteRepository'
import { VaultNotOpenError } from '../../domain/errors/VaultErrors'
import type { CreatedNoteDto } from '../dto'

export class CreateFolder {
  constructor(
    private readonly vaultRepo: VaultRepository,
    private readonly noteRepo: NoteRepository
  ) {}

  execute(folderPath: string, baseName: string): CreatedNoteDto {
    const vault = this.vaultRepo.getCurrent()
    if (!vault) {
      throw new VaultNotOpenError()
    }

    const path = this.noteRepo.createFolder(folderPath, baseName)
    return { path }
  }
}

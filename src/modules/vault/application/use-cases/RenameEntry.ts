import type { VaultRepository } from '@vault/domain/interfaces/VaultRepository'
import type { NoteRepository } from '@vault/domain/interfaces/NoteRepository'
import { VaultNotOpenError } from '@vault/domain/errors/VaultErrors'
import type { RenamedEntryDto } from '../dto'

export class RenameEntry {
  constructor(
    private readonly vaultRepo: VaultRepository,
    private readonly noteRepo: NoteRepository
  ) {}

  execute(oldPath: string, newName: string): RenamedEntryDto {
    const vault = this.vaultRepo.getCurrent()
    if (!vault) {
      throw new VaultNotOpenError()
    }

    const newPath = this.noteRepo.renameEntry(oldPath, newName)
    return { path: newPath }
  }
}

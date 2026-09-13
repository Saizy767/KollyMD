import type { VaultRepository } from '@vault/domain/interfaces/VaultRepository'
import type { NoteRepository } from '@vault/domain/interfaces/NoteRepository'
import { VaultNotOpenError } from '@vault/domain/errors/VaultErrors'

export class DeleteEntry {
  constructor(
    private readonly vaultRepo: VaultRepository,
    private readonly noteRepo: NoteRepository
  ) {}

  execute(entryPath: string): void {
    const vault = this.vaultRepo.getCurrent()
    if (!vault) {
      throw new VaultNotOpenError()
    }

    this.noteRepo.deleteEntry(entryPath)
  }
}

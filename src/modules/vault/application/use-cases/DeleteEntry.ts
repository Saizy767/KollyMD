import type { VaultRepository } from '../../domain/interfaces/VaultRepository'
import type { NoteRepository } from '../../domain/interfaces/NoteRepository'
import { VaultNotOpenError } from '../../domain/errors/VaultErrors'

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

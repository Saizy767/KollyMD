import type { VaultRepository } from '@vault/domain/interfaces/VaultRepository'
import type { NoteRepository } from '@vault/domain/interfaces/NoteRepository'
import { VaultNotOpenError } from '@vault/domain/errors/VaultErrors'

export class ReadNote {
  constructor(
    private readonly vaultRepo: VaultRepository,
    private readonly noteRepo: NoteRepository
  ) {}

  execute(filePath: string): string {
    const vault = this.vaultRepo.getCurrent()
    if (!vault) {
      throw new VaultNotOpenError()
    }
    return this.noteRepo.readNote(filePath)
  }
}

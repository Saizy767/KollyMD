import type { VaultRepository } from '../../domain/interfaces/VaultRepository'
import type { NoteRepository } from '../../domain/interfaces/NoteRepository'
import { VaultNotOpenError } from '../../domain/errors/VaultErrors'

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

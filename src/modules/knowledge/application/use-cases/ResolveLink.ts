import type { VaultRepository, NoteRepository } from '../../../vault'
import { VaultNotOpenError } from '../../../vault'
import type { ResolvedLinkDto } from '../dto'

export class ResolveLink {
  constructor(
    private readonly vaultRepo: VaultRepository,
    private readonly noteRepo: NoteRepository
  ) {}

  execute(noteName: string): ResolvedLinkDto | null {
    const vault = this.vaultRepo.getCurrent()
    if (!vault) {
      throw new VaultNotOpenError()
    }

    const path = this.noteRepo.findByNoteName(vault.rootPath, noteName)
    return path ? { path } : null
  }
}

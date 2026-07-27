import type { VaultRepository } from '../../domain/interfaces/VaultRepository'
import type { NoteRepository } from '../../domain/interfaces/NoteRepository'
import { VaultNotOpenError } from '../../domain/errors/VaultErrors'
import type { NoteEntryDto } from '../dto'
import type { NoteEntry } from '../../domain/entities/NoteEntry'

export class ListNotes {
  constructor(
    private readonly vaultRepo: VaultRepository,
    private readonly noteRepo: NoteRepository
  ) {}

  execute(): NoteEntryDto[] {
    const vault = this.vaultRepo.getCurrent()
    if (!vault) {
      throw new VaultNotOpenError()
    }

    const entries = this.noteRepo.listEntries(vault.rootPath)
    return entries.map(toDto)
  }
}

function toDto(entry: NoteEntry): NoteEntryDto {
  return {
    path: entry.path,
    name: entry.name,
    isDirectory: entry.isDirectory,
    children: entry.children.map(toDto)
  }
}

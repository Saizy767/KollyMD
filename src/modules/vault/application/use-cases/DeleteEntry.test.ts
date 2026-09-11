import { describe, it, expect, beforeEach } from 'vitest'
import { DeleteEntry } from './DeleteEntry'
import { Vault, VaultRepository, NoteRepository, VaultNotOpenError } from '../..'

class FakeVaultRepo implements VaultRepository {
  private vault: Vault | null = null
  getCurrent(): Vault | null { return this.vault }
  setCurrent(v: Vault): void { this.vault = v }
}

class FakeNoteRepo implements NoteRepository {
  deleted: string | null = null
  listEntries() { return [] }
  createNote() { return '' }
  createFolder() { return '' }
  readNote() { return '' }
  writeNote() {}
  findByNoteName() { return null }
  readAllNotes() { return [] }
  listFolders() { return [] }
  renameEntry() { return '' }
  deleteEntry(path: string) { this.deleted = path }
}

describe('DeleteEntry', () => {
  let vaultRepo: FakeVaultRepo
  let noteRepo: FakeNoteRepo

  beforeEach(() => {
    vaultRepo = new FakeVaultRepo()
    vaultRepo.setCurrent(new Vault('/vault'))
    noteRepo = new FakeNoteRepo()
  })

  it('throws VaultNotOpenError when no vault', () => {
    const uc = new DeleteEntry(new FakeVaultRepo(), noteRepo)
    expect(() => uc.execute('/vault/n.md')).toThrow(VaultNotOpenError)
  })

  it('deletes entry', () => {
    const uc = new DeleteEntry(vaultRepo, noteRepo)
    uc.execute('/vault/n.md')
    expect(noteRepo.deleted).toBe('/vault/n.md')
  })
})

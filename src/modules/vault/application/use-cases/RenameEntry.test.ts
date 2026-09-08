import { describe, it, expect, beforeEach } from 'vitest'
import { RenameEntry } from './RenameEntry'
import { Vault, VaultRepository, NoteRepository, VaultNotOpenError } from '../..'

class FakeVaultRepo implements VaultRepository {
  private vault: Vault | null = null
  getCurrent(): Vault | null { return this.vault }
  setCurrent(v: Vault): void { this.vault = v }
}

class FakeNoteRepo implements NoteRepository {
  renamed: { oldPath: string; newName: string } | null = null
  listEntries() { return [] }
  createNote() { return '' }
  createFolder() { return '' }
  readNote() { return '' }
  writeNote() {}
  findByNoteName() { return null }
  readAllNotes() { return [] }
  renameEntry(oldPath: string, newName: string) {
    this.renamed = { oldPath, newName }
    return oldPath.replace(/[^/\\]+$/, newName)
  }
  deleteEntry() {}
}

describe('RenameEntry', () => {
  let vaultRepo: FakeVaultRepo
  let noteRepo: FakeNoteRepo

  beforeEach(() => {
    vaultRepo = new FakeVaultRepo()
    vaultRepo.setCurrent(new Vault('/vault'))
    noteRepo = new FakeNoteRepo()
  })

  it('throws VaultNotOpenError when no vault', () => {
    const uc = new RenameEntry(new FakeVaultRepo(), noteRepo)
    expect(() => uc.execute('/vault/old.md', 'new.md')).toThrow(VaultNotOpenError)
  })

  it('renames and returns new path', () => {
    const uc = new RenameEntry(vaultRepo, noteRepo)
    const dto = uc.execute('/vault/old.md', 'new.md')
    expect(dto.path).toBe('/vault/new.md')
    expect(noteRepo.renamed).toEqual({ oldPath: '/vault/old.md', newName: 'new.md' })
  })
})

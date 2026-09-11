import { describe, it, expect, beforeEach } from 'vitest'
import { ResolveLink } from './ResolveLink'
import { Vault, VaultRepository, NoteRepository, VaultNotOpenError } from '../../../vault'

class FakeVaultRepo implements VaultRepository {
  private vault: Vault | null = null
  getCurrent(): Vault | null { return this.vault }
  setCurrent(v: Vault): void { this.vault = v }
}

class FakeNoteRepo implements NoteRepository {
  foundPath: string | null = null
  listEntries() { return [] }
  createNote() { return '' }
  createFolder() { return '' }
  readNote() { return '' }
  writeNote() {}
  findByNoteName() { return this.foundPath }
  readAllNotes() { return [] }
  listFolders() { return [] }
  renameEntry() { return '' }
  deleteEntry() {}
}

describe('ResolveLink', () => {
  let vaultRepo: FakeVaultRepo
  let noteRepo: FakeNoteRepo

  beforeEach(() => {
    vaultRepo = new FakeVaultRepo()
    vaultRepo.setCurrent(new Vault('/vault'))
    noteRepo = new FakeNoteRepo()
  })

  it('throws VaultNotOpenError when no vault', () => {
    const uc = new ResolveLink(new FakeVaultRepo(), noteRepo)
    expect(() => uc.execute('Note')).toThrow(VaultNotOpenError)
  })

  it('returns null when note not found', () => {
    const uc = new ResolveLink(vaultRepo, noteRepo)
    expect(uc.execute('Missing')).toBeNull()
  })

  it('returns path when note found', () => {
    noteRepo.foundPath = '/vault/Note.md'
    const uc = new ResolveLink(vaultRepo, noteRepo)
    expect(uc.execute('Note')).toEqual({ path: '/vault/Note.md' })
  })
})

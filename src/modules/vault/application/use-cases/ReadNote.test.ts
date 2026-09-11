import { describe, it, expect, beforeEach } from 'vitest'
import { ReadNote } from './ReadNote'
import { Vault, VaultRepository, NoteRepository, VaultNotOpenError } from '../..'

class FakeVaultRepo implements VaultRepository {
  private vault: Vault | null = null
  getCurrent(): Vault | null { return this.vault }
  setCurrent(v: Vault): void { this.vault = v }
}

class FakeNoteRepo implements NoteRepository {
  noteContent = 'note content'
  listEntries() { return [] }
  createNote() { return '' }
  createFolder() { return '' }
  readNote() { return this.noteContent }
  writeNote() {}
  findByNoteName() { return null }
  readAllNotes() { return [] }
  listFolders() { return [] }
  renameEntry() { return '' }
  deleteEntry() {}
}

describe('ReadNote', () => {
  let vaultRepo: FakeVaultRepo
  let noteRepo: FakeNoteRepo

  beforeEach(() => {
    vaultRepo = new FakeVaultRepo()
    vaultRepo.setCurrent(new Vault('/vault'))
    noteRepo = new FakeNoteRepo()
  })

  it('throws VaultNotOpenError when no vault', () => {
    const uc = new ReadNote(new FakeVaultRepo(), noteRepo)
    expect(() => uc.execute('/vault/n.md')).toThrow(VaultNotOpenError)
  })

  it('returns note content', () => {
    noteRepo.noteContent = 'hello world'
    const uc = new ReadNote(vaultRepo, noteRepo)
    expect(uc.execute('/vault/n.md')).toBe('hello world')
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { ListNotes } from './ListNotes'
import { Vault, VaultRepository, NoteRepository, VaultNotOpenError } from '../..'
import { NoteEntry } from '@vault/domain/entities/NoteEntry'

class FakeVaultRepo implements VaultRepository {
  private vault: Vault | null = null
  getCurrent(): Vault | null { return this.vault }
  setCurrent(v: Vault): void { this.vault = v }
}

class FakeNoteRepo implements NoteRepository {
  entries: NoteEntry[] = []
  listEntries() { return this.entries }
  createNote() { return '' }
  createFolder() { return '' }
  readNote() { return '' }
  writeNote() {}
  findByNoteName() { return null }
  readAllNotes() { return [] }
  listFolders() { return [] }
  renameEntry() { return '' }
  deleteEntry() {}
}

describe('ListNotes', () => {
  let vaultRepo: FakeVaultRepo
  let noteRepo: FakeNoteRepo

  beforeEach(() => {
    vaultRepo = new FakeVaultRepo()
    vaultRepo.setCurrent(new Vault('/vault'))
    noteRepo = new FakeNoteRepo()
  })

  it('throws VaultNotOpenError when no vault', () => {
    const uc = new ListNotes(new FakeVaultRepo(), noteRepo)
    expect(() => uc.execute()).toThrow(VaultNotOpenError)
  })

  it('returns empty array for empty vault', () => {
    const uc = new ListNotes(vaultRepo, noteRepo)
    expect(uc.execute()).toEqual([])
  })

  it('maps entries to DTOs', () => {
    noteRepo.entries = [
      new NoteEntry('/vault/folder', 'folder', true, [
        new NoteEntry('/vault/folder/note.md', 'note.md', false, [])
      ])
    ]
    const uc = new ListNotes(vaultRepo, noteRepo)
    const dtos = uc.execute()
    expect(dtos).toHaveLength(1)
    expect(dtos[0].path).toBe('/vault/folder')
    expect(dtos[0].isDirectory).toBe(true)
    expect(dtos[0].children).toHaveLength(1)
    expect(dtos[0].children[0].path).toBe('/vault/folder/note.md')
  })
})

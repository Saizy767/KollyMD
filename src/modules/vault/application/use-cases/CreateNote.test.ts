import { describe, it, expect, beforeEach } from 'vitest'
import { CreateNote } from './CreateNote'
import { Vault, VaultRepository, NoteRepository, VaultNotOpenError } from '../..'

class FakeVaultRepo implements VaultRepository {
  private vault: Vault | null = null
  getCurrent(): Vault | null { return this.vault }
  setCurrent(v: Vault): void { this.vault = v }
}

class FakeNoteRepo implements NoteRepository {
  createdNote: { folder: string; baseName: string; content: string } | null = null
  listEntries() { return [] }
  createNote(folder: string, baseName: string, content: string) {
    this.createdNote = { folder, baseName, content }
    return `${folder}/${baseName}`
  }
  createFolder() { return '' }
  readNote() { return '' }
  writeNote() {}
  findByNoteName() { return null }
  readAllNotes() { return [] }
  listFolders() { return [] }
  renameEntry() { return '' }
  deleteEntry() {}
}

describe('CreateNote', () => {
  let vaultRepo: FakeVaultRepo
  let noteRepo: FakeNoteRepo

  beforeEach(() => {
    vaultRepo = new FakeVaultRepo()
    vaultRepo.setCurrent(new Vault('/vault'))
    noteRepo = new FakeNoteRepo()
  })

  it('throws VaultNotOpenError when no vault', () => {
    const uc = new CreateNote(new FakeVaultRepo(), noteRepo)
    expect(() => uc.execute('/vault', 'note.md', '')).toThrow(VaultNotOpenError)
  })

  it('creates note and returns path', () => {
    const uc = new CreateNote(vaultRepo, noteRepo)
    const dto = uc.execute('/vault/sub', 'note.md', 'hello')
    expect(dto.path).toBe('/vault/sub/note.md')
    expect(noteRepo.createdNote).toEqual({ folder: '/vault/sub', baseName: 'note.md', content: 'hello' })
  })
})

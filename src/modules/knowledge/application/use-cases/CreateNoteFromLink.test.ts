import { describe, it, expect, beforeEach } from 'vitest'
import { CreateNoteFromLink } from './CreateNoteFromLink'
import { Vault, VaultRepository, NoteRepository, VaultNotOpenError } from '../../../vault'

class FakeVaultRepo implements VaultRepository {
  private vault: Vault | null = null
  getCurrent(): Vault | null { return this.vault }
  setCurrent(v: Vault): void { this.vault = v }
}

class FakeNoteRepo implements NoteRepository {
  foundPath: string | null = null
  createdNote: { folder: string; baseName: string; content: string } | null = null
  listEntries() { return [] }
  createNote(folder: string, baseName: string, content: string) {
    this.createdNote = { folder, baseName, content }
    return `${folder}/${baseName}`
  }
  createFolder() { return '' }
  readNote() { return '' }
  writeNote() {}
  findByNoteName() { return this.foundPath }
  readAllNotes() { return [] }
  listFolders() { return [] }
  renameEntry() { return '' }
  deleteEntry() {}
}

describe('CreateNoteFromLink', () => {
  let vaultRepo: FakeVaultRepo
  let noteRepo: FakeNoteRepo

  beforeEach(() => {
    vaultRepo = new FakeVaultRepo()
    vaultRepo.setCurrent(new Vault('/vault'))
    noteRepo = new FakeNoteRepo()
  })

  it('throws VaultNotOpenError when no vault', () => {
    const uc = new CreateNoteFromLink(new FakeVaultRepo(), noteRepo)
    expect(() => uc.execute('Note')).toThrow(VaultNotOpenError)
  })

  it('returns existing path if note already exists', () => {
    noteRepo.foundPath = '/vault/Note.md'
    const uc = new CreateNoteFromLink(vaultRepo, noteRepo)
    expect(uc.execute('Note')).toEqual({ path: '/vault/Note.md' })
    expect(noteRepo.createdNote).toBeNull()
  })

  it('creates new note with .md extension when not found', () => {
    const uc = new CreateNoteFromLink(vaultRepo, noteRepo)
    const dto = uc.execute('NewNote')
    expect(dto.path).toBe('/vault/NewNote.md')
    expect(noteRepo.createdNote).toEqual({ folder: '/vault', baseName: 'NewNote.md', content: '' })
  })
})

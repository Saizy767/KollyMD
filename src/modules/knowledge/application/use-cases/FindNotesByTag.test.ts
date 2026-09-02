import { describe, it, expect, beforeEach } from 'vitest'
import { FindNotesByTag } from './FindNotesByTag'
import { Vault, VaultRepository, NoteRepository, NoteContent, VaultNotOpenError } from '../../../vault'

class FakeVaultRepo implements VaultRepository {
  private vault: Vault | null = null
  getCurrent(): Vault | null { return this.vault }
  setCurrent(v: Vault): void { this.vault = v }
}

class FakeNoteRepo implements NoteRepository {
  notes: NoteContent[] = []
  readAllNotes(): NoteContent[] { return this.notes }
  listEntries() { return [] }
  createNote() { return '' }
  createFolder() { return '' }
  readNote() { return '' }
  writeNote() {}
  findByNoteName() { return null }
  renameEntry() { return '' }
  deleteEntry() {}
}

describe('FindNotesByTag', () => {
  let vaultRepo: FakeVaultRepo
  let noteRepo: FakeNoteRepo

  beforeEach(() => {
    vaultRepo = new FakeVaultRepo()
    vaultRepo.setCurrent(new Vault('/vault'))
    noteRepo = new FakeNoteRepo()
  })

  it('throws VaultNotOpenError when no vault', () => {
    const find = new FindNotesByTag(new FakeVaultRepo(), noteRepo)
    expect(() => find.execute('tag')).toThrow(VaultNotOpenError)
  })

  it('finds notes with matching tag', () => {
    noteRepo.notes = [
      { path: '/vault/a.md', content: '#tag content' },
      { path: '/vault/b.md', content: 'no tags' }
    ]
    const find = new FindNotesByTag(vaultRepo, noteRepo)
    const result = find.execute('tag')
    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('/vault/a.md')
  })

  it('matches case-insensitively', () => {
    noteRepo.notes = [{ path: '/vault/a.md', content: '#Tag' }]
    const find = new FindNotesByTag(vaultRepo, noteRepo)
    expect(find.execute('TAG')).toHaveLength(1)
  })

  it('returns empty when no notes match', () => {
    noteRepo.notes = [{ path: '/vault/a.md', content: '#other' }]
    const find = new FindNotesByTag(vaultRepo, noteRepo)
    expect(find.execute('tag')).toEqual([])
  })

  it('finds multiple notes', () => {
    noteRepo.notes = [
      { path: '/vault/a.md', content: '#tag' },
      { path: '/vault/b.md', content: 'text #tag more' },
      { path: '/vault/c.md', content: '#tag' }
    ]
    const find = new FindNotesByTag(vaultRepo, noteRepo)
    expect(find.execute('tag')).toHaveLength(3)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { FindBacklinks } from './FindBacklinks'
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

describe('FindBacklinks', () => {
  let vaultRepo: FakeVaultRepo
  let noteRepo: FakeNoteRepo

  beforeEach(() => {
    vaultRepo = new FakeVaultRepo()
    vaultRepo.setCurrent(new Vault('/vault'))
    noteRepo = new FakeNoteRepo()
  })

  it('throws VaultNotOpenError when no vault', () => {
    const find = new FindBacklinks(new FakeVaultRepo(), noteRepo)
    expect(() => find.execute('Target')).toThrow(VaultNotOpenError)
  })

  it('finds notes linking to target', () => {
    noteRepo.notes = [
      { path: '/vault/a.md', content: 'see [[Target]] here' },
      { path: '/vault/b.md', content: 'no links' }
    ]
    const find = new FindBacklinks(vaultRepo, noteRepo)
    const result = find.execute('Target')
    expect(result).toHaveLength(1)
    expect(result[0].sourcePath).toBe('/vault/a.md')
    expect(result[0].sourceName).toBe('a.md')
  })

  it('matches case-insensitively', () => {
    noteRepo.notes = [{ path: '/vault/a.md', content: '[[target]]' }]
    const find = new FindBacklinks(vaultRepo, noteRepo)
    const result = find.execute('TARGET')
    expect(result).toHaveLength(1)
  })

  it('returns empty when no backlinks', () => {
    noteRepo.notes = [{ path: '/vault/a.md', content: 'no links' }]
    const find = new FindBacklinks(vaultRepo, noteRepo)
    expect(find.execute('Target')).toEqual([])
  })

  it('finds multiple backlinks', () => {
    noteRepo.notes = [
      { path: '/vault/a.md', content: '[[Target]]' },
      { path: '/vault/b.md', content: '[[Target]] and [[Other]]' },
      { path: '/vault/c.md', content: '[[Target]]' }
    ]
    const find = new FindBacklinks(vaultRepo, noteRepo)
    expect(find.execute('Target')).toHaveLength(3)
  })
})

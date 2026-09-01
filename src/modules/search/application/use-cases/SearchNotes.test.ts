import { describe, it, expect, beforeEach } from 'vitest'
import { SearchNotes } from './SearchNotes'
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

describe('SearchNotes', () => {
  let vaultRepo: FakeVaultRepo
  let noteRepo: FakeNoteRepo

  beforeEach(() => {
    vaultRepo = new FakeVaultRepo()
    vaultRepo.setCurrent(new Vault('/vault'))
    noteRepo = new FakeNoteRepo()
  })

  it('throws VaultNotOpenError when no vault', () => {
    const search = new SearchNotes(new FakeVaultRepo(), noteRepo)
    expect(() => search.execute('foo')).toThrow(VaultNotOpenError)
  })

  it('returns empty for empty query', () => {
    const search = new SearchNotes(vaultRepo, noteRepo)
    expect(search.execute('')).toEqual([])
  })

  it('returns empty for whitespace query', () => {
    const search = new SearchNotes(vaultRepo, noteRepo)
    expect(search.execute('   ')).toEqual([])
  })

  it('matches in content with snippet markers', () => {
    noteRepo.notes = [{ path: '/vault/note.md', content: 'hello world foo bar' }]
    const search = new SearchNotes(vaultRepo, noteRepo)
    const results = search.execute('foo')
    expect(results).toHaveLength(1)
    expect(results[0].matchCount).toBe(1)
    expect(results[0].snippet).toContain('>>foo<<')
  })

  it('matches in filename', () => {
    noteRepo.notes = [{ path: '/vault/foo-note.md', content: 'no match here' }]
    const search = new SearchNotes(vaultRepo, noteRepo)
    const results = search.execute('foo')
    expect(results).toHaveLength(1)
    expect(results[0].matchCount).toBe(1)
    expect(results[0].snippet).toBe('[name match]')
  })

  it('counts multiple matches in content', () => {
    noteRepo.notes = [{ path: '/vault/n.md', content: 'foo and foo and foo' }]
    const search = new SearchNotes(vaultRepo, noteRepo)
    const results = search.execute('foo')
    expect(results[0].matchCount).toBe(3)
  })

  it('is case-insensitive', () => {
    noteRepo.notes = [{ path: '/vault/n.md', content: 'Foo FOO fOo' }]
    const search = new SearchNotes(vaultRepo, noteRepo)
    const results = search.execute('foo')
    expect(results[0].matchCount).toBe(3)
  })

  it('escapes regex special chars in query', () => {
    noteRepo.notes = [{ path: '/vault/n.md', content: 'price is $5.00 total' }]
    const search = new SearchNotes(vaultRepo, noteRepo)
    const results = search.execute('$5.00')
    expect(results).toHaveLength(1)
    expect(results[0].matchCount).toBe(1)
  })

  it('sorts results by matchCount descending', () => {
    noteRepo.notes = [
      { path: '/vault/a.md', content: 'x' },
      { path: '/vault/b.md', content: 'x x x' },
      { path: '/vault/c.md', content: 'x x' }
    ]
    const search = new SearchNotes(vaultRepo, noteRepo)
    const results = search.execute('x')
    expect(results.map(r => r.matchCount)).toEqual([3, 2, 1])
  })

  it('skips notes with no matches', () => {
    noteRepo.notes = [
      { path: '/vault/match.md', content: 'foo' },
      { path: '/vault/miss.md', content: 'bar' }
    ]
    const search = new SearchNotes(vaultRepo, noteRepo)
    const results = search.execute('foo')
    expect(results).toHaveLength(1)
    expect(results[0].path).toBe('/vault/match.md')
  })
})

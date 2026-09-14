import { describe, it, expect, beforeEach } from 'vitest'
import { FindImageReferences } from './FindImageReferences'
import { Vault, VaultRepository, NoteRepository, NoteContent, VaultNotOpenError } from '@vault'

class FakeVaultRepo implements VaultRepository {
  private vault: Vault | null = null
  getCurrent(): Vault | null { return this.vault }
  setCurrent(v: Vault): void { this.vault = v }
}

class FakeNoteRepo implements NoteRepository {
  notes: NoteContent[] = []
  listEntries() { return [] }
  createNote() { return '' }
  createFolder() { return '' }
  readNote() { return '' }
  writeNote() {}
  findByNoteName() { return null }
  readAllNotes(): NoteContent[] { return this.notes }
  listFolders() { return [] }
  renameEntry() { return '' }
  deleteEntry() {}
}

describe('FindImageReferences', () => {
  let vaultRepo: FakeVaultRepo
  let noteRepo: FakeNoteRepo

  beforeEach(() => {
    vaultRepo = new FakeVaultRepo()
    vaultRepo.setCurrent(new Vault('/vault'))
    noteRepo = new FakeNoteRepo()
  })

  it('throws VaultNotOpenError when no vault', () => {
    const uc = new FindImageReferences(new FakeVaultRepo(), noteRepo)
    expect(() => uc.execute('img.png')).toThrow(VaultNotOpenError)
  })

  it('finds notes that embed the image', () => {
    noteRepo.notes = [
      { path: '/vault/a.md', content: '![[photo.png]]' },
      { path: '/vault/b.md', content: 'no images' },
      { path: '/vault/c.md', content: '![[photo.png|300]]' }
    ]
    const uc = new FindImageReferences(vaultRepo, noteRepo)
    const refs = uc.execute('photo.png')
    expect(refs).toEqual([
      { path: '/vault/a.md', name: 'a.md' },
      { path: '/vault/c.md', name: 'c.md' }
    ])
  })

  it('matches case-insensitively', () => {
    noteRepo.notes = [
      { path: '/vault/a.md', content: '![[Photo.PNG]]' }
    ]
    const uc = new FindImageReferences(vaultRepo, noteRepo)
    const refs = uc.execute('photo.png')
    expect(refs).toHaveLength(1)
  })

  it('returns empty when no notes reference the image', () => {
    noteRepo.notes = [{ path: '/vault/a.md', content: '![[other.png]]' }]
    const uc = new FindImageReferences(vaultRepo, noteRepo)
    expect(uc.execute('photo.png')).toEqual([])
  })
})

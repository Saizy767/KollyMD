import { describe, it, expect, beforeEach } from 'vitest'
import { CreateFolder } from './CreateFolder'
import { Vault, VaultRepository, NoteRepository, VaultNotOpenError } from '../..'

class FakeVaultRepo implements VaultRepository {
  private vault: Vault | null = null
  getCurrent(): Vault | null { return this.vault }
  setCurrent(v: Vault): void { this.vault = v }
}

class FakeNoteRepo implements NoteRepository {
  createdFolder: { parent: string; name: string } | null = null
  listEntries() { return [] }
  createNote() { return '' }
  createFolder(parent: string, name: string) {
    this.createdFolder = { parent, name }
    return `${parent}/${name}`
  }
  readNote() { return '' }
  writeNote() {}
  findByNoteName() { return null }
  readAllNotes() { return [] }
  listFolders() { return [] }
  renameEntry() { return '' }
  deleteEntry() {}
}

describe('CreateFolder', () => {
  let vaultRepo: FakeVaultRepo
  let noteRepo: FakeNoteRepo

  beforeEach(() => {
    vaultRepo = new FakeVaultRepo()
    vaultRepo.setCurrent(new Vault('/vault'))
    noteRepo = new FakeNoteRepo()
  })

  it('throws VaultNotOpenError when no vault', () => {
    const uc = new CreateFolder(new FakeVaultRepo(), noteRepo)
    expect(() => uc.execute('/vault', 'sub')).toThrow(VaultNotOpenError)
  })

  it('creates folder and returns path', () => {
    const uc = new CreateFolder(vaultRepo, noteRepo)
    const dto = uc.execute('/vault', 'sub')
    expect(dto.path).toBe('/vault/sub')
    expect(noteRepo.createdFolder).toEqual({ parent: '/vault', name: 'sub' })
  })
})

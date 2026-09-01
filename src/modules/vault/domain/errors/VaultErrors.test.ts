import { describe, it, expect } from 'vitest'
import { DomainError } from '../../../../shared/domain/errors/DomainError'
import { InvalidVaultPathError, VaultNotOpenError, NoteNotFoundError, NoteNameCollisionError, EntryNotFoundError } from './VaultErrors'

describe('VaultErrors', () => {
  it('InvalidVaultPathError has correct code and message', () => {
    const err = new InvalidVaultPathError('/bad')
    expect(err).toBeInstanceOf(DomainError)
    expect(err).toBeInstanceOf(InvalidVaultPathError)
    expect(err.code).toBe('INVALID_VAULT_PATH')
    expect(err.message).toBe('Invalid vault path: "/bad"')
  })

  it('VaultNotOpenError has correct code', () => {
    const err = new VaultNotOpenError()
    expect(err).toBeInstanceOf(DomainError)
    expect(err.code).toBe('VAULT_NOT_OPEN')
  })

  it('NoteNotFoundError has correct code and message', () => {
    const err = new NoteNotFoundError('/note.md')
    expect(err).toBeInstanceOf(DomainError)
    expect(err.code).toBe('NOTE_NOT_FOUND')
    expect(err.message).toBe('Note not found: "/note.md"')
  })

  it('NoteNameCollisionError has correct code', () => {
    const err = new NoteNameCollisionError('untitled')
    expect(err).toBeInstanceOf(DomainError)
    expect(err.code).toBe('NOTE_NAME_COLLISION')
  })

  it('EntryNotFoundError has correct code', () => {
    const err = new EntryNotFoundError('/path')
    expect(err).toBeInstanceOf(DomainError)
    expect(err.code).toBe('ENTRY_NOT_FOUND')
  })
})

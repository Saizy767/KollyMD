import { DomainError } from '../../../../shared/domain/errors/DomainError'

export class InvalidVaultPathError extends DomainError {
  readonly code = 'INVALID_VAULT_PATH'

  constructor(path: string) {
    super(`Invalid vault path: "${path}"`)
  }
}

export class VaultNotOpenError extends DomainError {
  readonly code = 'VAULT_NOT_OPEN'

  constructor() {
    super('No vault is currently open')
  }
}

export class NoteNotFoundError extends DomainError {
  readonly code = 'NOTE_NOT_FOUND'

  constructor(path: string) {
    super(`Note not found: "${path}"`)
  }
}

export class NoteNameCollisionError extends DomainError {
  readonly code = 'NOTE_NAME_COLLISION'

  constructor(baseName: string) {
    super(`Cannot create note: too many name collisions for "${baseName}"`)
  }
}

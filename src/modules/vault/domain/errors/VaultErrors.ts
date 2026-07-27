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

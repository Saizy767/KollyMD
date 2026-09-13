import { DomainError } from '../../shared/domain/errors/DomainError'

export class ButtonAlreadyRegisteredError extends DomainError {
  readonly code = 'BUTTON_ALREADY_REGISTERED'

  constructor(id: string) {
    super(`Button module already registered: "${id}"`)
  }
}

export class ButtonNotFoundError extends DomainError {
  readonly code = 'BUTTON_NOT_FOUND'

  constructor(id: string) {
    super(`Button module not found: "${id}"`)
  }
}

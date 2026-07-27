import { DomainError } from '../../../../shared/domain/errors/DomainError'

export class NoDocumentOpenError extends DomainError {
  readonly code = 'NO_DOCUMENT_OPEN'

  constructor() {
    super('No document is currently open')
  }
}

export class DocumentHasNoPathError extends DomainError {
  readonly code = 'DOCUMENT_HAS_NO_PATH'

  constructor() {
    super('Document has no path; use Save As instead')
  }
}

export class TabNotFoundError extends DomainError {
  readonly code = 'TAB_NOT_FOUND'

  constructor(id: string) {
    super(`Tab not found: "${id}"`)
  }
}

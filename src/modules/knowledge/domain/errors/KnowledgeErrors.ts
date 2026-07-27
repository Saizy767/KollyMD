import { DomainError } from '../../../../shared/domain/errors/DomainError'

export class NoteFromLinkExistsError extends DomainError {
  readonly code = 'NOTE_FROM_LINK_EXISTS'

  constructor(noteName: string) {
    super(`Note already exists for link: "${noteName}"`)
  }
}

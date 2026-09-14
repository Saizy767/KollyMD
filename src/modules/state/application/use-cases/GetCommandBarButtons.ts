import type { StateRepository } from '@state/domain/interfaces/StateRepository'

export class GetCommandBarButtons {
  constructor(private readonly repo: StateRepository) {}

  execute(): string[] {
    return this.repo.load().commandBarButtons
  }
}

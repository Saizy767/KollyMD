import { WorkspaceState } from '../entities/WorkspaceState'

export interface StateRepository {
  load(): WorkspaceState
  save(state: WorkspaceState): void
}

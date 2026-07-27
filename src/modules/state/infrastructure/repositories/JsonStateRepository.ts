import * as fs from 'fs'
import * as path from 'path'
import type { StateRepository } from '../../domain/interfaces/StateRepository'
import { WorkspaceState } from '../../domain/entities/WorkspaceState'
import { Logger } from '../../../../shared/infrastructure/Logger'

export class JsonStateRepository implements StateRepository {
  private readonly filePath: string
  private readonly logger = new Logger()

  constructor(stateFilePath: string) {
    this.filePath = stateFilePath
  }

  load(): WorkspaceState {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8')
      const data = JSON.parse(raw)
      return new WorkspaceState(
        data.lastVaultPath ?? null,
        data.recentFiles ?? [],
        data.openTabs ?? []
      )
    } catch (e) {
      this.logger.warn('Failed to load state, returning empty', { filePath: this.filePath, error: (e as Error).message })
      return new WorkspaceState()
    }
  }

  save(state: WorkspaceState): void {
    const dir = path.dirname(this.filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(
      this.filePath,
      JSON.stringify(
        {
          lastVaultPath: state.lastVaultPath,
          recentFiles: state.recentFiles,
          openTabs: state.openTabs
        },
        null,
        2
      ),
      'utf-8'
    )
  }
}

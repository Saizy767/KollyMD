import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import type { StateRepository } from '../../domain/interfaces/StateRepository'
import { WorkspaceState } from '../../domain/entities/WorkspaceState'

export class JsonStateRepository implements StateRepository {
  private readonly filePath: string

  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'kollymd-state.json')
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
    } catch {
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

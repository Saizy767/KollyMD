import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { Logger } from '../../../../shared/infrastructure/Logger'

export class ModStateRepository {
  private readonly filePath: string
  private readonly logger = new Logger()

  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'mod-state.json')
  }

  private loadAll(): Record<string, unknown> {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8')
      const data = JSON.parse(raw)
      return typeof data === 'object' && data !== null ? data : {}
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn('Failed to load mod-state, returning empty', { error: (e as Error).message })
      }
      return {}
    }
  }

  get(modId: string): unknown {
    return this.loadAll()[modId] ?? null
  }

  set(modId: string, data: unknown): void {
    const all = this.loadAll()
    all[modId] = data
    const dir = path.dirname(this.filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(this.filePath, JSON.stringify(all, null, 2), 'utf-8')
  }
}

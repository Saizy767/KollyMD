import type { WatchEvent } from '../entities/WatchEvent'

export interface FileWatcher {
  start(rootPath: string, onChange: (batch: WatchEvent[]) => void): void
  close(): void
  isRunning(): boolean
}

import chokidar from 'chokidar'
import type { FileWatcher } from '../../domain/interfaces/FileWatcher'
import { WatchEvent } from '../../domain/entities/WatchEvent'

const DEBOUNCE_MS = 150

export class ChokidarFileWatcher implements FileWatcher {
  private watcher?: chokidar.FSWatcher
  private pending: WatchEvent[] = []
  private timer?: NodeJS.Timeout

  start(rootPath: string, onChange: (batch: WatchEvent[]) => void): void {
    this.close()
    this.watcher = chokidar.watch(rootPath, {
      ignored: /(^|[/\\])\../,
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 }
    })
    const push = (type: WatchEvent['type'], p: string): void => {
      this.pending.push(new WatchEvent(type, p))
      this.schedule(onChange)
    }
    this.watcher.on('add', p => push('add', p))
    this.watcher.on('unlink', p => push('unlink', p))
    this.watcher.on('change', p => push('change', p))
    this.watcher.on('addDir', p => push('addDir', p))
    this.watcher.on('unlinkDir', p => push('unlinkDir', p))
  }

  private schedule(onChange: (batch: WatchEvent[]) => void): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      const batch = this.pending
      this.pending = []
      this.timer = undefined
      if (batch.length > 0) onChange(batch)
    }, DEBOUNCE_MS)
  }

  close(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
    this.pending = []
    if (this.watcher) {
      this.watcher.close().catch(() => {})
      this.watcher = undefined
    }
  }

  isRunning(): boolean {
    return this.watcher !== undefined
  }
}

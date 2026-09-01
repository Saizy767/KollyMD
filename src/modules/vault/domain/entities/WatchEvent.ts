export type WatchEventType = 'add' | 'unlink' | 'change' | 'addDir' | 'unlinkDir'

export class WatchEvent {
  constructor(
    public readonly type: WatchEventType,
    public readonly path: string
  ) {}
}

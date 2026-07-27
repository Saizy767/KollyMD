export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

export class Logger {
  constructor(private readonly level: LogLevel = 'warn') {}

  error(message: string, context?: unknown): void {
    this.log('error', message, context)
  }

  warn(message: string, context?: unknown): void {
    this.log('warn', message, context)
  }

  info(message: string, context?: unknown): void {
    this.log('info', message, context)
  }

  debug(message: string, context?: unknown): void {
    this.log('debug', message, context)
  }

  private log(level: LogLevel, message: string, context?: unknown): void {
    const order: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 }
    if (order[level] > order[this.level]) return

    const ts = new Date().toISOString()
    const ctx = context !== undefined ? ' ' + JSON.stringify(context) : ''
    const line = `[${ts}] [${level.toUpperCase()}] ${message}${ctx}`

    if (level === 'error') {
      console.error(line)
    } else if (level === 'warn') {
      console.warn(line)
    } else {
      console.log(line)
    }
  }
}

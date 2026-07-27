import * as fs from 'fs'
import * as path from 'path'
import type { NoteRepository, NoteContent } from '../../domain/interfaces/NoteRepository'
import { NoteEntry } from '../../domain/entities/NoteEntry'
import { NoteNotFoundError, NoteNameCollisionError } from '../../domain/errors/VaultErrors'
import { Logger } from '../../../../shared/infrastructure/Logger'

export class FsNoteRepository implements NoteRepository {
  private readonly logger = new Logger()

  listEntries(rootPath: string): NoteEntry[] {
    return this.readDir(rootPath)
  }

  createNote(folderPath: string, baseName: string, content: string): string {
    const ext = path.extname(baseName)
    const stem = path.basename(baseName, ext)
    const dir = path.dirname(baseName)

    let candidate = baseName
    let counter = 0
    while (fs.existsSync(path.join(folderPath, candidate))) {
      counter++
      if (counter > 1000) {
        throw new NoteNameCollisionError(baseName)
      }
      candidate = path.join(dir, `${stem}-${counter}${ext}`)
    }

    const fullPath = path.join(folderPath, candidate)
    fs.writeFileSync(fullPath, content, 'utf-8')
    return fullPath
  }

  readNote(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      throw new NoteNotFoundError(filePath)
    }
    return fs.readFileSync(filePath, 'utf-8')
  }

  writeNote(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, 'utf-8')
  }

  findByNoteName(vaultRoot: string, name: string): string | null {
    const target = name.toLowerCase()
    return this.searchByName(vaultRoot, target)
  }

  readAllNotes(vaultRoot: string): NoteContent[] {
    const notes: NoteContent[] = []
    this.collectNotes(vaultRoot, notes)
    return notes
  }

  private searchByName(dirPath: string, target: string): string | null {
    let names: string[]
    try {
      names = fs.readdirSync(dirPath)
    } catch (e) {
      this.logger.warn('Failed to read directory during name search', { dirPath, error: (e as Error).message })
      return null
    }

    for (const name of names) {
      if (name.startsWith('.')) continue
      const fullPath = path.join(dirPath, name)
      let isDir: boolean
      try {
        isDir = fs.statSync(fullPath).isDirectory()
      } catch {
        continue
      }
      if (isDir) {
        const found = this.searchByName(fullPath, target)
        if (found) return found
      } else if (name.toLowerCase() === target + '.md') {
        return fullPath
      }
    }
    return null
  }

  private collectNotes(dirPath: string, notes: NoteContent[]): void {
    let names: string[]
    try {
      names = fs.readdirSync(dirPath)
    } catch (e) {
      this.logger.warn('Failed to read directory during note collection', { dirPath, error: (e as Error).message })
      return
    }

    for (const name of names) {
      if (name.startsWith('.')) continue
      const fullPath = path.join(dirPath, name)
      let isDir: boolean
      try {
        isDir = fs.statSync(fullPath).isDirectory()
      } catch {
        continue
      }
      if (isDir) {
        this.collectNotes(fullPath, notes)
      } else if (name.toLowerCase().endsWith('.md')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8')
          notes.push({ path: fullPath, content })
        } catch (e) {
          this.logger.warn('Failed to read note during collection', { fullPath, error: (e as Error).message })
        }
      }
    }
  }

  private readDir(dirPath: string): NoteEntry[] {
    let names: string[]
    try {
      names = fs.readdirSync(dirPath)
    } catch (e) {
      this.logger.warn('Failed to read directory, returning empty list', { dirPath, error: (e as Error).message })
      return []
    }

    const entries: NoteEntry[] = []

    for (const name of names) {
      if (name.startsWith('.')) continue

      const fullPath = path.join(dirPath, name)
      let isDir: boolean
      try {
        isDir = fs.statSync(fullPath).isDirectory()
      } catch (e) {
        this.logger.warn('Failed to stat entry, skipping', { fullPath, error: (e as Error).message })
        continue
      }

      const children = isDir ? this.readDir(fullPath) : []
      entries.push(new NoteEntry(fullPath, name, isDir, children))
    }

    entries.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    return entries
  }
}

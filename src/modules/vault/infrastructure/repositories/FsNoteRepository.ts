import * as fs from 'fs'
import * as path from 'path'
import type { NoteRepository } from '../../domain/interfaces/NoteRepository'
import { NoteEntry } from '../../domain/entities/NoteEntry'

export class FsNoteRepository implements NoteRepository {
  listEntries(rootPath: string): NoteEntry[] {
    return this.readDir(rootPath)
  }

  private readDir(dirPath: string): NoteEntry[] {
    let names: string[]
    try {
      names = fs.readdirSync(dirPath)
    } catch {
      return []
    }

    const entries: NoteEntry[] = []

    for (const name of names) {
      if (name.startsWith('.')) continue

      const fullPath = path.join(dirPath, name)
      let isDir: boolean
      try {
        isDir = fs.statSync(fullPath).isDirectory()
      } catch {
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

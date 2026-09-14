import * as fs from 'fs'
import * as path from 'path'
import type { ImageRepository } from '@vault/domain/interfaces/ImageRepository'
import { ImageSaveError } from '@vault/domain/errors/VaultErrors'

export class FsImageRepository implements ImageRepository {
  async saveImage(folderPath: string, baseName: string, data: ArrayBuffer): Promise<string> {
    const fullPath = path.join(folderPath, baseName)
    try {
      await fs.promises.writeFile(fullPath, Buffer.from(data))
    } catch (e) {
      throw new ImageSaveError(`Failed to write image "${baseName}": ${(e as Error).message}`)
    }
    return fullPath
  }

  async imageExists(folderPath: string, baseName: string): Promise<boolean> {
    try {
      await fs.promises.access(path.join(folderPath, baseName))
      return true
    } catch {
      return false
    }
  }
}

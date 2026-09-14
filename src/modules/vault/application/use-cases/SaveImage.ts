import type { VaultRepository } from '@vault/domain/interfaces/VaultRepository'
import type { ImageRepository } from '@vault/domain/interfaces/ImageRepository'
import { VaultNotOpenError, ImageSaveError } from '@vault/domain/errors/VaultErrors'
import type { SavedImageDto } from '../dto'

const SUPPORTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp']

function validateExtension(fileName: string): void {
  const dotIdx = fileName.lastIndexOf('.')
  if (dotIdx < 0) {
    throw new ImageSaveError(`Unsupported image format: no extension in "${fileName}"`)
  }
  const ext = fileName.slice(dotIdx + 1).toLowerCase()
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new ImageSaveError(`Unsupported image format: .${ext}`)
  }
}

function withSuffix(baseName: string, counter: number): string {
  const dotIdx = baseName.lastIndexOf('.')
  if (dotIdx < 0) return `${baseName}_${counter}`
  return `${baseName.slice(0, dotIdx)}_${counter}${baseName.slice(dotIdx)}`
}

export class SaveImage {
  constructor(
    private readonly vaultRepo: VaultRepository,
    private readonly imageRepo: ImageRepository
  ) {}

  async execute(fileName: string, fileData: ArrayBuffer): Promise<SavedImageDto> {
    validateExtension(fileName)

    const vault = this.vaultRepo.getCurrent()
    if (!vault) {
      throw new VaultNotOpenError()
    }

    let candidate = fileName
    let counter = 0
    while (await this.imageRepo.imageExists(vault.rootPath, candidate)) {
      counter++
      if (counter > 1000) {
        throw new ImageSaveError(`Too many name collisions for "${fileName}"`)
      }
      candidate = withSuffix(fileName, counter)
    }

    const fullPath = await this.imageRepo.saveImage(vault.rootPath, candidate, fileData)
    return { savedFileName: candidate, path: fullPath }
  }
}

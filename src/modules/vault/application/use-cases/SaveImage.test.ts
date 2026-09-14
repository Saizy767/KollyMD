import { describe, it, expect, beforeEach } from 'vitest'
import { SaveImage } from './SaveImage'
import { Vault, VaultRepository, ImageRepository, VaultNotOpenError, ImageSaveError } from '../..'

class FakeVaultRepo implements VaultRepository {
  private vault: Vault | null = null
  getCurrent(): Vault | null { return this.vault }
  setCurrent(v: Vault): void { this.vault = v }
}

class FakeImageRepo implements ImageRepository {
  saved: { folder: string; baseName: string; data: ArrayBuffer } | null = null
  existing = new Set<string>()
  async saveImage(folder: string, baseName: string, data: ArrayBuffer): Promise<string> {
    this.saved = { folder, baseName, data }
    return `${folder}/${baseName}`
  }
  async imageExists(folder: string, baseName: string): Promise<boolean> {
    return this.existing.has(`${folder}/${baseName}`)
  }
}

describe('SaveImage', () => {
  let vaultRepo: FakeVaultRepo
  let imageRepo: FakeImageRepo

  beforeEach(() => {
    vaultRepo = new FakeVaultRepo()
    vaultRepo.setCurrent(new Vault('/vault'))
    imageRepo = new FakeImageRepo()
  })

  it('throws VaultNotOpenError when no vault', async () => {
    const uc = new SaveImage(new FakeVaultRepo(), imageRepo)
    const data = new ArrayBuffer(3)
    await expect(uc.execute('img.png', data)).rejects.toThrow(VaultNotOpenError)
  })

  it('throws ImageSaveError for unsupported extension', async () => {
    const uc = new SaveImage(vaultRepo, imageRepo)
    const data = new ArrayBuffer(3)
    await expect(uc.execute('file.txt', data)).rejects.toThrow(ImageSaveError)
  })

  it('saves image to vault root and returns savedFileName + path', async () => {
    const uc = new SaveImage(vaultRepo, imageRepo)
    const data = new ArrayBuffer(3)
    const dto = await uc.execute('photo.png', data)
    expect(dto.savedFileName).toBe('photo.png')
    expect(dto.path).toBe('/vault/photo.png')
    expect(imageRepo.saved).toEqual({ folder: '/vault', baseName: 'photo.png', data })
  })

  it('adds _1 suffix when file already exists', async () => {
    imageRepo.existing.add('/vault/photo.png')
    const uc = new SaveImage(vaultRepo, imageRepo)
    const data = new ArrayBuffer(3)
    const dto = await uc.execute('photo.png', data)
    expect(dto.savedFileName).toBe('photo_1.png')
    expect(dto.path).toBe('/vault/photo_1.png')
  })

  it('adds _2 suffix when _1 also exists', async () => {
    imageRepo.existing.add('/vault/photo.png')
    imageRepo.existing.add('/vault/photo_1.png')
    const uc = new SaveImage(vaultRepo, imageRepo)
    const data = new ArrayBuffer(3)
    const dto = await uc.execute('photo.png', data)
    expect(dto.savedFileName).toBe('photo_2.png')
  })
})

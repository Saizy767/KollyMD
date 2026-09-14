export interface ImageRepository {
  saveImage(folderPath: string, baseName: string, data: ArrayBuffer): Promise<string>
  imageExists(folderPath: string, baseName: string): Promise<boolean>
}

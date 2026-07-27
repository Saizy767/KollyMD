export interface VaultApi {
  openVault: () => Promise<{ rootPath: string } | null>
  getCurrentVault: () => Promise<{ rootPath: string } | null>
}

export {}

declare global {
  interface Window {
    api: {
      vault: VaultApi
    }
  }
}

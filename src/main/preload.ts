import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

const pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()

function genReqId(channel: string): string {
  return `${channel}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function request<T>(channel: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const reqId = genReqId(channel)
    pending.set(reqId, { resolve: resolve as (v: unknown) => void, reject })
    ipcRenderer.send(channel, { reqId, args })
  })
}

interface ReplyPayload {
  reqId: string
  data?: unknown
  error?: boolean
  code?: string
}

ipcRenderer.on('kolly:reply', (_e: IpcRendererEvent, payload: ReplyPayload) => {
  const p = pending.get(payload.reqId)
  if (!p) return
  pending.delete(payload.reqId)
  if (payload.error) {
    const err = new Error('Request failed') as Error & { code?: string }
    err.code = payload.code
    p.reject(err)
  } else {
    p.resolve(payload.data ?? null)
  }
})

const api = {
  vault: {
    openVault: () => request<{ rootPath: string } | null>('vault:open-vault'),
    getCurrentVault: () => request<{ rootPath: string } | null>('vault:get-current-vault'),
    listNotes: () => request<unknown[]>('vault:list-notes'),
    createNote: (folderPath: string, baseName: string, content: string) =>
      request<{ path: string }>('vault:create-note', folderPath, baseName, content)
  },
  editor: {
    openDocument: (filePath: string) =>
      request<{ docId: string; path: string; content: string; alreadyOpen: boolean }>(
        'editor:open-document',
        filePath
      ),
    saveDocument: (content: string) => request<void>('editor:save-document', content),
    saveAsDocument: (content: string) =>
      request<{ path: string } | null>('editor:save-as-document', content),
    newDocument: () => request<{ docId: string }>('editor:new-document'),
    markDirty: (docId: string, dirty: boolean) =>
      request<void>('editor:mark-dirty', docId, dirty),
    closeDocument: (docId: string) =>
      request<{ newActiveId: string | null }>('editor:close-document', docId),
    switchDocument: (docId: string) => request<void>('editor:switch-document', docId),
    getOpenDocuments: () =>
      request<{ tabs: unknown[]; activeId: string | null }>('editor:get-open-documents'),
    getOpenTabs: () => request<string[]>('editor:get-open-tabs')
  }
}

contextBridge.exposeInMainWorld('api', api)

export type KollyApi = typeof api

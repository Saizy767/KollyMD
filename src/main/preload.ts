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
}

ipcRenderer.on('kolly:reply', (_e: IpcRendererEvent, payload: ReplyPayload) => {
  const p = pending.get(payload.reqId)
  if (!p) return
  pending.delete(payload.reqId)
  if (payload.error) {
    p.reject(new Error('Request failed'))
  } else {
    p.resolve(payload.data ?? null)
  }
})

const api = {
  vault: {
    openVault: () => request<{ rootPath: string } | null>('vault:open-vault'),
    getCurrentVault: () => request<{ rootPath: string } | null>('vault:get-current-vault'),
    listNotes: () => request<unknown[]>('vault:list-notes')
  }
}

contextBridge.exposeInMainWorld('api', api)

export type KollyApi = typeof api

import { IpcMain, dialog, BrowserWindow } from 'electron'
import * as path from 'path'
import type { GetCurrentVault } from '../../../vault'
import type { OpenDocument } from '../../application/use-cases/OpenDocument'
import type { SaveDocument } from '../../application/use-cases/SaveDocument'
import type { SaveAsDocument } from '../../application/use-cases/SaveAsDocument'
import type { NewDocument } from '../../application/use-cases/NewDocument'
import type { MarkDirty } from '../../application/use-cases/MarkDirty'
import type { OpenDocumentDto, SavedDocumentDto } from '../../application/dto'
import { DocumentHasNoPathError } from '../../domain/errors/EditorErrors'

export class EditorIpcHandler {
  constructor(
    private readonly ipcMain: IpcMain,
    private readonly openDocument: OpenDocument,
    private readonly saveDocument: SaveDocument,
    private readonly saveAsDocument: SaveAsDocument,
    private readonly newDocument: NewDocument,
    private readonly markDirty: MarkDirty,
    private readonly getCurrentVault: GetCurrentVault
  ) {}

  register(): void {
    this.ipcMain.on(
      'editor:open-document',
      (event, payload: { reqId: string; args: [string] }) => {
        const { reqId, args } = payload
        const [filePath] = args
        try {
          const dto: OpenDocumentDto = this.openDocument.execute(filePath)
          event.reply('kolly:reply', { reqId, data: dto })
        } catch (e) {
          dialog.showMessageBox({
            type: 'error',
            message: (e as Error).message
          })
          event.reply('kolly:reply', { reqId, error: true })
        }
      }
    )

    this.ipcMain.on(
      'editor:save-document',
      (event, payload: { reqId: string; args: [string] }) => {
        const { reqId, args } = payload
        const [content] = args
        try {
          this.saveDocument.execute(content)
          event.reply('kolly:reply', { reqId, data: null })
        } catch (e) {
          if (e instanceof DocumentHasNoPathError) {
            event.reply('kolly:reply', { reqId, error: true, code: 'DOCUMENT_HAS_NO_PATH' })
            return
          }
          dialog.showMessageBox({
            type: 'error',
            message: (e as Error).message
          })
          event.reply('kolly:reply', { reqId, error: true })
        }
      }
    )

    this.ipcMain.on(
      'editor:save-as-document',
      (event, payload: { reqId: string; args: [string] }) => {
        const { reqId, args } = payload
        const [content] = args
        try {
          const win = BrowserWindow.fromWebContents(event.sender)
          const vault = this.getCurrentVault.execute()
          const defaultPath = vault ? path.join(vault.rootPath, 'untitled.md') : undefined

          dialog
            .showSaveDialog(win!, {
              defaultPath,
              filters: [{ name: 'Markdown', extensions: ['md'] }]
            })
            .then(result => {
              if (result.canceled || !result.filePath) {
                event.reply('kolly:reply', { reqId, data: null })
                return
              }
              const dto: SavedDocumentDto = this.saveAsDocument.execute(result.filePath, content)
              event.reply('kolly:reply', { reqId, data: dto })
            })
            .catch(err => {
              dialog.showMessageBox({
                type: 'error',
                message: (err as Error).message
              })
              event.reply('kolly:reply', { reqId, error: true })
            })
        } catch (e) {
          dialog.showMessageBox({
            type: 'error',
            message: (e as Error).message
          })
          event.reply('kolly:reply', { reqId, error: true })
        }
      }
    )

    this.ipcMain.on('editor:new-document', (event, payload: { reqId: string }) => {
      const { reqId } = payload
      try {
        this.newDocument.execute()
        event.reply('kolly:reply', { reqId, data: null })
      } catch (e) {
        dialog.showMessageBox({
          type: 'error',
          message: (e as Error).message
        })
        event.reply('kolly:reply', { reqId, error: true })
      }
    })

    this.ipcMain.on(
      'editor:mark-dirty',
      (event, payload: { reqId: string; args: [boolean] }) => {
        const { reqId, args } = payload
        const [dirty] = args
        try {
          this.markDirty.execute(dirty)
          event.reply('kolly:reply', { reqId, data: null })
        } catch (e) {
          event.reply('kolly:reply', { reqId, error: true })
        }
      }
    )
  }
}

import { IpcMain, dialog } from 'electron'
import type { FindBacklinks } from '../../application/use-cases/FindBacklinks'
import type { FindNotesByTag } from '../../application/use-cases/FindNotesByTag'
import type { ResolveLink } from '../../application/use-cases/ResolveLink'
import type { CreateNoteFromLink } from '../../application/use-cases/CreateNoteFromLink'
import type {
  BacklinkDto,
  NoteRefDto,
  ResolvedLinkDto,
  CreatedNoteFromLinkDto
} from '../../application/dto'

export class KnowledgeIpcHandler {
  constructor(
    private readonly ipcMain: IpcMain,
    private readonly findBacklinks: FindBacklinks,
    private readonly findNotesByTag: FindNotesByTag,
    private readonly resolveLink: ResolveLink,
    private readonly createNoteFromLink: CreateNoteFromLink
  ) {}

  register(): void {
    this.ipcMain.on(
      'knowledge:find-backlinks',
      (event, payload: { reqId: string; args: [string] }) => {
        const { reqId, args } = payload
        const [noteName] = args
        try {
          const dto: BacklinkDto[] = this.findBacklinks.execute(noteName)
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
      'knowledge:find-notes-by-tag',
      (event, payload: { reqId: string; args: [string] }) => {
        const { reqId, args } = payload
        const [tag] = args
        try {
          const dto: NoteRefDto[] = this.findNotesByTag.execute(tag)
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
      'knowledge:resolve-link',
      (event, payload: { reqId: string; args: [string] }) => {
        const { reqId, args } = payload
        const [noteName] = args
        try {
          const dto: ResolvedLinkDto | null = this.resolveLink.execute(noteName)
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
      'knowledge:create-note-from-link',
      (event, payload: { reqId: string; args: [string] }) => {
        const { reqId, args } = payload
        const [noteName] = args
        try {
          const dto: CreatedNoteFromLinkDto = this.createNoteFromLink.execute(noteName)
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
  }
}

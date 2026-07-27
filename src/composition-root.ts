import type { IpcMain } from 'electron'
import { app } from 'electron'
import { AppConfig } from './shared/infrastructure/AppConfig'
import {
  InMemoryVaultRepository,
  FsNoteRepository,
  OpenVault,
  GetCurrentVault,
  ListNotes,
  CreateNote,
  VaultIpcHandler,
  Vault
} from './modules/vault'
import {
  InMemoryDocumentRepository,
  OpenDocument,
  SaveDocument,
  SaveAsDocument,
  NewDocument,
  MarkDirty,
  CloseDocument,
  SwitchDocument,
  GetOpenDocuments,
  EditorIpcHandler
} from './modules/editor'
import {
  MarkedMarkdownRenderer,
  RenderMarkdown,
  FindBacklinks,
  FindNotesByTag,
  ResolveLink,
  CreateNoteFromLink,
  KnowledgeIpcHandler
} from './modules/knowledge'
import {
  JsonStateRepository,
  GetLastVault,
  SetLastVault,
  GetOpenTabs,
  SetOpenTabs
} from './modules/state'

export function bootstrap(ipcMain: IpcMain): void {
  const config = AppConfig.create(app.getPath('userData'))
  const stateRepo = new JsonStateRepository(config.stateFilePath)
  const getLastVault = new GetLastVault(stateRepo)
  const setLastVault = new SetLastVault(stateRepo)
  const getOpenTabs = new GetOpenTabs(stateRepo)
  const setOpenTabs = new SetOpenTabs(stateRepo)

  const vaultRepo = new InMemoryVaultRepository()
  const noteRepo = new FsNoteRepository()
  const openVault = new OpenVault(vaultRepo)
  const getCurrentVault = new GetCurrentVault(vaultRepo)
  const listNotes = new ListNotes(vaultRepo, noteRepo)
  const createNote = new CreateNote(vaultRepo, noteRepo)

  const docRepo = new InMemoryDocumentRepository()
  const openDocument = new OpenDocument(docRepo, noteRepo)
  const saveDocument = new SaveDocument(docRepo, noteRepo)
  const saveAsDocument = new SaveAsDocument(docRepo, noteRepo)
  const newDocument = new NewDocument(docRepo)
  const markDirty = new MarkDirty(docRepo)
  const closeDocument = new CloseDocument(docRepo)
  const switchDocument = new SwitchDocument(docRepo)
  const getOpenDocuments = new GetOpenDocuments(docRepo)

  const markdownRenderer = new MarkedMarkdownRenderer()
  const renderMarkdown = new RenderMarkdown(markdownRenderer)
  const findBacklinks = new FindBacklinks(vaultRepo, noteRepo)
  const findNotesByTag = new FindNotesByTag(vaultRepo, noteRepo)
  const resolveLink = new ResolveLink(vaultRepo, noteRepo)
  const createNoteFromLink = new CreateNoteFromLink(vaultRepo, noteRepo)

  const lastVaultPath = getLastVault.execute()
  if (lastVaultPath) {
    vaultRepo.setCurrent(new Vault(lastVaultPath))
  }

  const vaultIpc = new VaultIpcHandler(
    ipcMain,
    openVault,
    getCurrentVault,
    listNotes,
    createNote,
    setLastVault
  )
  vaultIpc.register()

  const editorIpc = new EditorIpcHandler(
    ipcMain,
    openDocument,
    saveDocument,
    saveAsDocument,
    newDocument,
    markDirty,
    closeDocument,
    switchDocument,
    getOpenDocuments,
    getOpenTabs,
    getCurrentVault
  )
  editorIpc.register()

  const knowledgeIpc = new KnowledgeIpcHandler(
    ipcMain,
    renderMarkdown,
    findBacklinks,
    findNotesByTag,
    resolveLink,
    createNoteFromLink
  )
  knowledgeIpc.register()

  app.on('before-quit', () => {
    const result = getOpenDocuments.execute()
    const paths = result.tabs
      .filter(t => t.path !== null)
      .map(t => t.path as string)
    setOpenTabs.execute(paths)
  })
}

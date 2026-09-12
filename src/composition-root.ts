import type { IpcMain, BrowserWindow } from 'electron'
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { AppConfig } from './shared/infrastructure/AppConfig'
import {
  InMemoryVaultRepository,
  FsNoteRepository,
  ChokidarFileWatcher,
  OpenVault,
  GetCurrentVault,
  ListNotes,
  CreateNote,
  CreateFolder,
  RenameEntry,
  DeleteEntry,
  ReadNote,
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
  UpdateDocumentPath,
  ReorderDocuments,
  EditorIpcHandler
} from './modules/editor'
import {
  FindBacklinks,
  FindNotesByTag,
  ResolveLink,
  CreateNoteFromLink,
  KnowledgeIpcHandler
} from './modules/knowledge'
import type { VaultRepository, NoteRepository } from './modules/vault'
import {
  JsonStateRepository,
  GetLastVault,
  SetLastVault,
  GetOpenTabs,
  SetOpenTabs,
  GetSidebarWidth,
  SetSidebarWidth,
  GetActiveTabPath,
  SetActiveTabPath,
  GetExpandedFolders,
  SetExpandedFolders,
  GetCommandBarButtons,
  SetCommandBarButtons,
  GetActivePanel,
  SetActivePanel,
  GetModState,
  SetModState,
  StateIpcHandler
} from './modules/state'

interface ServerModDeps {
  ipcMain: IpcMain
  vaultRepo: VaultRepository
  noteRepo: NoteRepository
}

function loadServerMods(modsDir: string, deps: ServerModDeps): void {
  if (!fs.existsSync(modsDir)) return
  for (const folder of fs.readdirSync(modsDir)) {
    const serverPath = path.join(modsDir, folder, 'server', 'index.js')
    if (!fs.existsSync(serverPath)) continue
    try {
      const mod = require(serverPath) as { register: (d: ServerModDeps) => void }
      mod.register(deps)
    } catch (e) {
      console.error('[KollyMD] Server mod failed to load: ' + folder, e)
    }
  }
}

export function bootstrap(ipcMain: IpcMain, getMainWindow: () => BrowserWindow | null): void {
  const config = AppConfig.create(app.getPath('userData'))
  const stateRepo = new JsonStateRepository(config.stateFilePath)
  const getLastVault = new GetLastVault(stateRepo)
  const setLastVault = new SetLastVault(stateRepo)
  const getOpenTabs = new GetOpenTabs(stateRepo)
  const setOpenTabs = new SetOpenTabs(stateRepo)
  const getSidebarWidth = new GetSidebarWidth(stateRepo)
  const setSidebarWidth = new SetSidebarWidth(stateRepo)
  const getActiveTabPath = new GetActiveTabPath(stateRepo)
  const setActiveTabPath = new SetActiveTabPath(stateRepo)
  const getExpandedFolders = new GetExpandedFolders(stateRepo)
  const setExpandedFolders = new SetExpandedFolders(stateRepo)
  const getCommandBarButtons = new GetCommandBarButtons(stateRepo)
  const setCommandBarButtons = new SetCommandBarButtons(stateRepo)
  const getActivePanel = new GetActivePanel(stateRepo)
  const setActivePanel = new SetActivePanel(stateRepo)
  const getModState = new GetModState(stateRepo)
  const setModState = new SetModState(stateRepo)

  const vaultRepo = new InMemoryVaultRepository()
  const noteRepo = new FsNoteRepository()
  const fileWatcher = new ChokidarFileWatcher()
  const openVault = new OpenVault(vaultRepo)
  const getCurrentVault = new GetCurrentVault(vaultRepo)
  const listNotes = new ListNotes(vaultRepo, noteRepo)
  const createNote = new CreateNote(vaultRepo, noteRepo)
  const createFolder = new CreateFolder(vaultRepo, noteRepo)
  const renameEntry = new RenameEntry(vaultRepo, noteRepo)
  const deleteEntry = new DeleteEntry(vaultRepo, noteRepo)
  const readNote = new ReadNote(vaultRepo, noteRepo)

  const docRepo = new InMemoryDocumentRepository()
  const openDocument = new OpenDocument(docRepo, noteRepo)
  const saveDocument = new SaveDocument(docRepo, noteRepo)
  const saveAsDocument = new SaveAsDocument(docRepo, noteRepo)
  const newDocument = new NewDocument(docRepo)
  const markDirty = new MarkDirty(docRepo)
  const closeDocument = new CloseDocument(docRepo)
  const switchDocument = new SwitchDocument(docRepo)
  const getOpenDocuments = new GetOpenDocuments(docRepo)
  const updateDocumentPath = new UpdateDocumentPath(docRepo)
  const reorderDocuments = new ReorderDocuments(docRepo)

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
    createFolder,
    renameEntry,
    deleteEntry,
    readNote,
    fileWatcher,
    getMainWindow,
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
    updateDocumentPath,
    reorderDocuments,
    getOpenTabs,
    getCurrentVault
  )
  editorIpc.register()

  const knowledgeIpc = new KnowledgeIpcHandler(
    ipcMain,
    findBacklinks,
    findNotesByTag,
    resolveLink,
    createNoteFromLink
  )
  knowledgeIpc.register()

  loadServerMods(path.join(__dirname, 'renderer', 'mods'), {
    ipcMain,
    vaultRepo,
    noteRepo,
  })

  const stateIpc = new StateIpcHandler(
    ipcMain,
    getSidebarWidth,
    setSidebarWidth,
    getActiveTabPath,
    setActiveTabPath,
    getExpandedFolders,
    setExpandedFolders,
    getCommandBarButtons,
    setCommandBarButtons,
    getActivePanel,
    setActivePanel,
    getModState,
    setModState
  )
  stateIpc.register()

  app.on('before-quit', () => {
    fileWatcher.close()
    const result = getOpenDocuments.execute()
    const paths = result.tabs
      .filter(t => t.path !== null)
      .map(t => t.path as string)
    setOpenTabs.execute(paths)
    const active = docRepo.getActiveDocument()
    setActiveTabPath.execute(active?.path ?? null)
  })
}

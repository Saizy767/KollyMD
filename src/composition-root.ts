import type { IpcMain, BrowserWindow } from 'electron'
import { app } from 'electron'
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
  StaticButtonTemplateRepository,
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
  GetAvailableButtonTemplates,
  EditorIpcHandler
} from './modules/editor'
import {
  FindBacklinks,
  FindNotesByTag,
  ResolveLink,
  CreateNoteFromLink,
  KnowledgeIpcHandler
} from './modules/knowledge'
import { SearchNotes, SearchIpcHandler, SearchEntries, SearchEntriesIpcHandler } from './modules/search'
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
  GetSearchPanelState,
  SetSearchPanelState,
  StateIpcHandler
} from './modules/state'

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
  const getSearchPanelState = new GetSearchPanelState(stateRepo)
  const setSearchPanelState = new SetSearchPanelState(stateRepo)

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

  const buttonTemplateRepo = new StaticButtonTemplateRepository()
  const getAvailableButtonTemplates = new GetAvailableButtonTemplates(buttonTemplateRepo)

  const findBacklinks = new FindBacklinks(vaultRepo, noteRepo)
  const findNotesByTag = new FindNotesByTag(vaultRepo, noteRepo)
  const resolveLink = new ResolveLink(vaultRepo, noteRepo)
  const createNoteFromLink = new CreateNoteFromLink(vaultRepo, noteRepo)

  const searchNotes = new SearchNotes(vaultRepo, noteRepo)
  const searchEntries = new SearchEntries(vaultRepo, noteRepo)

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
    getAvailableButtonTemplates,
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

  const searchIpc = new SearchIpcHandler(ipcMain, searchNotes)
  searchIpc.register()

  const searchEntriesIpc = new SearchEntriesIpcHandler(ipcMain, searchEntries)
  searchEntriesIpc.register()

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
    getSearchPanelState,
    setSearchPanelState
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

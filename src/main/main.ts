import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import { autoUpdater } from 'electron-updater'
import { bootstrap } from '../composition-root'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error(`[did-fail-load] code=${code} desc=${desc} url=${url}`)
  })
  win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
  })
  win.webContents.on('render-process-gone', (_e, details) => {
    console.error(`[render-process-gone] ${JSON.stringify(details)}`)
  })

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html')).catch(err => {
    console.error(`[loadFile rejected] ${err}`)
  })
}

app.whenReady().then(() => {
  bootstrap(ipcMain, () => BrowserWindow.getAllWindows()[0] ?? null)
  createWindow()

  if (app.isPackaged && process.platform === 'linux') {
    autoUpdater.logger = console
    autoUpdater.checkForUpdatesAndNotify().catch(() => {})
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

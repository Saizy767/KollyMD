import { app, BrowserWindow, ipcMain, session } from 'electron'
import * as path from 'path'
import * as chokidar from 'chokidar'
import { autoUpdater } from 'electron-updater'
import { bootstrap } from '../composition-root'

function setCspPolicy(isDev: boolean): void {
  const csp = isDev
    ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws://localhost:5173 http://localhost:5173; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:"
    : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:"
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })
}

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
  win.webContents.on('console-message', (e) => {
    console.log(`[renderer:${e.level}] ${e.message} (${e.sourceId}:${e.lineNumber})`)
  })
  win.webContents.on('render-process-gone', (_e, details) => {
    console.error(`[render-process-gone] ${JSON.stringify(details)}`)
  })

  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    win.loadURL('http://localhost:5173').catch(err => {
      console.error(`[loadURL rejected] ${err}`)
    })
  } else {
    win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html')).catch(err => {
      console.error(`[loadFile rejected] ${err}`)
    })
  }
}

app.whenReady().then(() => {
  const isDev = process.env.NODE_ENV === 'development'
  setCspPolicy(isDev)
  bootstrap(ipcMain, () => BrowserWindow.getAllWindows()[0] ?? null)
  createWindow()

  if (isDev) {
    let restarting = false
    const distRoot = path.join(__dirname, '..')
    chokidar.watch(distRoot, { ignored: /renderer/, ignoreInitial: true }).on('change', () => {
      if (restarting) return
      restarting = true
      app.relaunch()
      app.exit()
    })
  }

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

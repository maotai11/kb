import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { resolveAppPaths } from '../shared/paths';
import { initializeDatabase } from './db';
import { registerHandlers } from './ipc/registerHandlers';

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'dist', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const rendererEntry = app.isPackaged
    ? path.join(app.getAppPath(), 'dist', 'renderer', 'index.html')
    : 'http://localhost:5173';

  void (app.isPackaged ? window.loadFile(rendererEntry) : window.loadURL(rendererEntry));

  window.once('ready-to-show', () => {
    window.show();
  });
}

app.whenReady().then(() => {
  const paths = resolveAppPaths(app.getPath('appData'));
  app.setPath('userData', paths.appDataDir);
  const db = initializeDatabase(paths.dbPath);
  registerHandlers(db);
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

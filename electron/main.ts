import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { DiskLensDbQueries } from './db/queries';
import { registerIpcHandlers } from './ipc-handlers';

let mainWindow: BrowserWindow | null = null;
let database: DiskLensDbQueries;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'DiskLens - Professional Disk Space Analyzer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    frame: true,
    show: false
  });

  database = new DiskLensDbQueries(app.getPath('userData'));
  await database.init();

  registerIpcHandlers(mainWindow, database);

  const devUrl = process.env.ELECTRON_DEV_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

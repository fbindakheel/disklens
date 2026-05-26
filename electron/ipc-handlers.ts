import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { DiskScanner } from './scanner';
import { DiskLensDbQueries } from './db/queries';
import { safeDelete } from './cleanup/cleaner';
import { detectJunk } from './cleanup/detector';
import { findDuplicates } from './duplicates/hasher';

const scanner = new DiskScanner();

function isValidPath(p: string): boolean {
  if (typeof p !== 'string') return false;
  try {
    const resolved = path.resolve(p);
    return !p.includes('..') && !resolved.includes('..') && path.isAbsolute(resolved);
  } catch {
    return false;
  }
}

export function registerIpcHandlers(mainWindow: BrowserWindow, database: DiskLensDbQueries) {
  
  // Platform specific scanning
  ipcMain.on('scan-directory', async (event, rootPath) => {
    if (!isValidPath(rootPath)) {
      mainWindow.webContents.send('scan-error', 'Invalid scan target directory path.');
      return;
    }
    scanner.start(
      rootPath,
      (progress) => {
        mainWindow.webContents.send('scan-progress', progress);
      },
      async (result) => {
        const header = {
          id: Date.now().toString(),
          path: rootPath,
          timestamp: Date.now(),
          durationMs: result.summary.durationMs,
          totalFiles: result.summary.totalFiles,
          totalFolders: result.summary.totalFolders,
          totalSize: result.summary.totalSize
        };
        
        await database.saveScan(header, result.items);
        mainWindow.webContents.send('scan-complete', { header, result });
      },
      (err) => {
        mainWindow.webContents.send('scan-error', err.message);
      }
    );
  });

  ipcMain.on('stop-scan', () => {
    scanner.stop();
  });

  ipcMain.handle('select-directory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    if (canceled) return null;
    return filePaths[0];
  });

  ipcMain.handle('get-scan-history', async () => {
    return await database.getScans();
  });

  ipcMain.handle('get-scan-details', async (event, id) => {
    return await database.getScanDetails(id);
  });

  ipcMain.handle('delete-paths', async (event, paths: string[]) => {
    const validatedPaths = paths.filter(isValidPath);
    if (validatedPaths.length !== paths.length) {
      return [{ path: 'validation', success: false, error: 'Path traversal or invalid path detected.' }];
    }
    return await safeDelete(validatedPaths);
  });

  ipcMain.on('show-item-in-folder', (event, p) => {
    if (isValidPath(p)) {
      shell.showItemInFolder(p);
    }
  });

  ipcMain.on('open-file', (event, p) => {
    if (isValidPath(p)) {
      shell.openPath(p);
    }
  });

  // Smart junk detection
  ipcMain.handle('detect-junk-files', async (event, items: any[]) => {
    return detectJunk(items);
  });

  // Progress-tracked duplicate finder
  ipcMain.handle('find-duplicate-files', async (event, items: any[]) => {
    return await findDuplicates(items, (current, total) => {
      mainWindow.webContents.send('duplicate-progress', { current, total });
    });
  });

  // Reports
  ipcMain.handle('export-report', async (event, type: 'csv' | 'json' | 'html', reportData: any) => {
    const { title, date, rootPath, totalSize, totalFiles, totalFolders, items } = reportData;
    const extMap = { csv: 'csv', json: 'json', html: 'html' };
    const filterMap = {
      csv: [{ name: 'CSV Files', extensions: ['csv'] }],
      json: [{ name: 'JSON Files', extensions: ['json'] }],
      html: [{ name: 'HTML Files', extensions: ['html'] }]
    };

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export DiskLens Report',
      defaultPath: `disklens_report_${Date.now()}.${extMap[type]}`,
      filters: filterMap[type]
    });

    if (!filePath) return false;

    try {
      let content = '';

      if (type === 'csv') {
        const headers = ['Path', 'Name', 'Size (Bytes)', 'Type', 'IsDirectory', 'LastModified'];
        const rows = items.map((item: any) => 
          `"${item.path.replace(/"/g, '""')}"` + ',' +
          `"${item.name.replace(/"/g, '""')}"` + ',' +
          item.size + ',' +
          `"${item.type}"` + ',' +
          item.isDir + ',' +
          item.modifiedTime
        );
        content = [headers.join(','), ...rows].join('\n');
      } else if (type === 'json') {
        content = JSON.stringify(reportData, null, 2);
      } else if (type === 'html') {
        const top10 = items.slice(0, 10);
        content = `
<!DOCTYPE html>
<html>
<head>
  <title>DiskLens Report - ${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background-color: #0b0f19; color: #f8fafc; padding: 40px; margin: 0; }
    .card { background: #161e31; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    h1 { color: #3f98a3; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #1e293b; }
    th { background: #1e293b; }
  </style>
</head>
<body>
  <div class="card">
    <h1>DiskLens Disk Analyzer Report</h1>
    <p><strong>Scan Target:</strong> ${rootPath}</p>
    <p><strong>Scan Date:</strong> ${date}</p>
    <p><strong>Total Size:</strong> ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB (${totalSize.toLocaleString()} Bytes)</p>
    <p><strong>Files:</strong> ${totalFiles.toLocaleString()}</p>
    <p><strong>Folders:</strong> ${totalFolders.toLocaleString()}</p>
  </div>
  <div class="card">
    <h2>Top 10 Largest Items</h2>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Path</th>
          <th>Size</th>
        </tr>
      </thead>
      <tbody>
        ${top10.map((item: any) => `
          <tr>
            <td><strong>${item.name}</strong></td>
            <td>${item.path}</td>
            <td>${(item.size / 1024 / 1024).toFixed(2)} MB</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>
        `;
      }

      await fs.writeFile(filePath, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  });
}

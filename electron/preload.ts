import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  scanDirectory: (path: string) => ipcRenderer.send('scan-directory', path),
  stopScan: () => ipcRenderer.send('stop-scan'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getScanHistory: () => ipcRenderer.invoke('get-scan-history'),
  getScanDetails: (id: string) => ipcRenderer.invoke('get-scan-details', id),
  deletePaths: (paths: string[]) => ipcRenderer.invoke('delete-paths', paths),
  showItemInFolder: (path: string) => ipcRenderer.send('show-item-in-folder', path),
  openFile: (path: string) => ipcRenderer.send('open-file', path),
  exportReport: (type: 'csv' | 'json' | 'html', data: any) => ipcRenderer.invoke('export-report', type, data),
  
  detectJunkFiles: (items: any[]) => ipcRenderer.invoke('detect-junk-files', items),
  findDuplicateFiles: (items: any[]) => ipcRenderer.invoke('find-duplicate-files', items),

  onScanProgress: (callback: (event: any, progress: any) => void) => {
    ipcRenderer.on('scan-progress', callback);
    return () => ipcRenderer.removeListener('scan-progress', callback);
  },
  onScanComplete: (callback: (event: any, result: any) => void) => {
    ipcRenderer.on('scan-complete', callback);
    return () => ipcRenderer.removeListener('scan-complete', callback);
  },
  onScanError: (callback: (event: any, error: string) => void) => {
    ipcRenderer.on('scan-error', callback);
    return () => ipcRenderer.removeListener('scan-error', callback);
  },
  onDuplicateProgress: (callback: (event: any, progress: any) => void) => {
    ipcRenderer.on('duplicate-progress', callback);
    return () => ipcRenderer.removeListener('duplicate-progress', callback);
  }
});

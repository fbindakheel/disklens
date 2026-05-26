export interface ElectronAPI {
  scanDirectory: (path: string) => void;
  stopScan: () => void;
  selectDirectory: () => Promise<string | null>;
  getScanHistory: () => Promise<any[]>;
  getScanDetails: (id: string) => Promise<any[]>;
  deletePaths: (paths: string[]) => Promise<{ path: string; success: boolean; error?: string }[]>;
  showItemInFolder: (path: string) => void;
  openFile: (path: string) => void;
  exportReport: (type: 'csv' | 'json' | 'html', data: any) => Promise<boolean>;
  
  detectJunkFiles: (items: any[]) => Promise<any[]>;
  findDuplicateFiles: (items: any[]) => Promise<Record<string, string[]>>;

  onScanProgress: (callback: (event: any, progress: any) => void) => () => void;
  onScanComplete: (callback: (event: any, result: any) => void) => () => void;
  onScanError: (callback: (event: any, error: string) => void) => () => void;
  onDuplicateProgress: (callback: (event: any, progress: any) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

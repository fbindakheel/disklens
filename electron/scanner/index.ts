import { WinMftScanner } from './win-mft-scanner';

export interface ScanResult {
  items: any[];
  summary: {
    totalFiles: number;
    totalFolders: number;
    totalSize: number;
    durationMs: number;
  };
}

export class DiskScanner {
  private activeScanner: WinMftScanner | null = null;

  start(
    rootPath: string,
    onProgress: (progress: any) => void,
    onComplete: (result: ScanResult) => void,
    onError: (err: any) => void
  ) {
    if (this.activeScanner) {
      this.activeScanner.stop();
    }

    if (process.platform !== 'win32') {
      onError(new Error('This application only supports Windows.'));
      return;
    }

    this.activeScanner = new WinMftScanner();
    this.activeScanner.start(
      rootPath,
      onProgress,
      onComplete,
      onError
    );
  }

  stop() {
    if (this.activeScanner) {
      this.activeScanner.stop();
      this.activeScanner = null;
    }
  }

  async checkAdminPrivileges(): Promise<boolean> {
    if (process.platform === 'win32') {
      const winScanner = new WinMftScanner();
      return await winScanner.checkAdmin();
    }
    return false;
  }
}

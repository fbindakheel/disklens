import { MacScanner } from './mac-scanner';
import { WinMftScanner } from './win-mft-scanner';
import { LinuxScanner } from './linux-scanner';

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
  private activeScanner: MacScanner | WinMftScanner | LinuxScanner | null = null;

  start(
    rootPath: string,
    onProgress: (progress: any) => void,
    onComplete: (result: ScanResult) => void,
    onError: (err: any) => void
  ) {
    if (this.activeScanner) {
      this.activeScanner.stop();
    }

    const platform = process.platform;
    if (platform === 'darwin') {
      this.activeScanner = new MacScanner();
    } else if (platform === 'win32') {
      this.activeScanner = new WinMftScanner();
    } else {
      this.activeScanner = new LinuxScanner();
    }

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
    return true;
  }
}

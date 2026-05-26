import * as fs from 'fs/promises';
import * as path from 'path';
import { ScanHeader, FileEntry } from './schema';

export class DiskLensDbQueries {
  private baseDir: string;
  private scansPath: string;

  constructor(userDataPath: string) {
    this.baseDir = path.join(userDataPath, 'DiskLensData');
    this.scansPath = path.join(this.baseDir, 'scans.json');
  }

  async init() {
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.mkdir(path.join(this.baseDir, 'scans'), { recursive: true });
    
    try {
      await fs.access(this.scansPath);
    } catch {
      await fs.writeFile(this.scansPath, JSON.stringify([]));
    }
  }

  async getScans(): Promise<ScanHeader[]> {
    try {
      const data = await fs.readFile(this.scansPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async saveScan(header: ScanHeader, files: FileEntry[]) {
    const scans = await this.getScans();
    scans.push(header);
    await fs.writeFile(this.scansPath, JSON.stringify(scans, null, 2));

    const detailPath = path.join(this.baseDir, 'scans', `scan_${header.id}.json`);
    await fs.writeFile(detailPath, JSON.stringify(files));
  }

  async getScanDetails(id: string): Promise<FileEntry[] | null> {
    const detailPath = path.join(this.baseDir, 'scans', `scan_${id}.json`);
    try {
      const data = await fs.readFile(detailPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async clearHistory() {
    await fs.writeFile(this.scansPath, JSON.stringify([]));
    try {
      const files = await fs.readdir(path.join(this.baseDir, 'scans'));
      for (const file of files) {
        await fs.unlink(path.join(this.baseDir, 'scans', file));
      }
    } catch {
      // Ignored if empty
    }
  }
}

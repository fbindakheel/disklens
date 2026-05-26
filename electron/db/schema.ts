export interface ScanHeader {
  id: string;
  path: string;
  timestamp: number;
  durationMs: number;
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
}

export interface FileEntry {
  path: string;
  name: string;
  size: number;
  modifiedTime: number;
  isDir: boolean;
  type: string;
  depth: number;
}

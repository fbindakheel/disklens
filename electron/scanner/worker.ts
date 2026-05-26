import { parentPort, workerData } from 'worker_threads';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ScanProgress {
  filesScanned: number;
  foldersScanned: number;
  bytesScanned: number;
  currentFolder: string;
}

const rootPath = workerData.rootPath;
let filesScanned = 0;
let foldersScanned = 0;
let bytesScanned = 0;
let isStopped = false;

const fileTypes: Record<string, string> = {
  pdf: 'document', doc: 'document', docx: 'document', txt: 'document', md: 'document',
  mp4: 'media', mov: 'media', mp3: 'media', wav: 'media', jpg: 'media', png: 'media', jpeg: 'media', gif: 'media', svg: 'media', webp: 'media',
  js: 'code', ts: 'code', py: 'code', go: 'code', rs: 'code', html: 'code', css: 'code', json: 'code',
  zip: 'archive', tar: 'archive', gz: 'archive', '7z': 'archive', dmg: 'archive', rar: 'archive',
  exe: 'system', msi: 'system', dll: 'system', sys: 'system', app: 'system'
};

function getFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return (ext && fileTypes[ext]) || 'other';
}

interface FileItem {
  path: string;
  name: string;
  size: number;
  modifiedTime: number;
  isDir: boolean;
  type: string;
  depth: number;
}

const allItems: FileItem[] = [];

let lastReportTime = Date.now();
function reportProgress(currentFolder: string) {
  const now = Date.now();
  if (now - lastReportTime > 150) {
    parentPort?.postMessage({
      type: 'progress',
      data: { filesScanned, foldersScanned, bytesScanned, currentFolder } as ScanProgress
    });
    lastReportTime = now;
  }
}

// Track visited realpaths to prevent infinite symlink loops
const visitedDirs = new Set<string>();

async function scan(dirPath: string, depth = 0) {
  if (isStopped) return;
  
  try {
    // Prevent infinite symlink loops
    let realPath = dirPath;
    try {
      realPath = await fs.realpath(dirPath);
    } catch {
      // Fallback
    }

    if (visitedDirs.has(realPath)) return;
    visitedDirs.add(realPath);

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    foldersScanned++;
    reportProgress(dirPath);

    const subdirs: string[] = [];

    for (const entry of entries) {
      if (isStopped) return;
      const fullPath = path.join(dirPath, entry.name);

      try {
        if (entry.isSymbolicLink()) {
          // Skip symlinks to avoid cross-device bounds and loop traps
          continue;
        }

        if (entry.isDirectory()) {
          subdirs.push(fullPath);
        } else if (entry.isFile()) {
          const stat = await fs.stat(fullPath);
          const size = stat.size;
          const mtime = stat.mtimeMs;
          const type = getFileType(entry.name);

          const item: FileItem = {
            path: fullPath,
            name: entry.name,
            size,
            modifiedTime: mtime,
            isDir: false,
            type,
            depth
          };

          allItems.push(item);
          filesScanned++;
          bytesScanned += size;
        }
      } catch (err) {
        // Inaccessible
      }
    }

    // High concurrency crawl
    await Promise.all(subdirs.map(subdir => scan(subdir, depth + 1)));

  } catch (err) {
    // Inaccessible
  }
}

async function startScan() {
  const startTime = Date.now();
  
  parentPort?.on('message', (msg) => {
    if (msg.type === 'stop') {
      isStopped = true;
    }
  });

  await scan(rootPath);
  
  if (isStopped) {
    parentPort?.postMessage({ type: 'stopped' });
    return;
  }

  parentPort?.postMessage({
    type: 'complete',
    data: {
      items: allItems,
      summary: {
        totalFiles: filesScanned,
        totalFolders: foldersScanned,
        totalSize: bytesScanned,
        durationMs: Date.now() - startTime
      }
    }
  });
}

startScan();

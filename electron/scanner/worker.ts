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

const allItems: any[] = [];
const folderSizes = new Map<string, number>();
const visitedDirs = new Set<string>();

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

// Simple Promise-based Semaphore to limit concurrency and saturate disk queues
class Semaphore {
  private permits: number;
  private queue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire() {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release() {
    this.permits++;
    if (this.queue.length > 0) {
      this.permits--;
      const next = this.queue.shift()!;
      next();
    }
  }
}

// Limit concurrent file stats to 512 and directory reads to 128 to saturate IO queues without running out of handles
const statSemaphore = new Semaphore(512);
const dirSemaphore = new Semaphore(128);

function addSizeToAncestors(filePath: string, size: number) {
  let dir = path.dirname(filePath);
  while (true) {
    folderSizes.set(dir, (folderSizes.get(dir) || 0) + size);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

async function scanDir(dirPath: string, depth = 0) {
  if (isStopped) return;

  let realPath = dirPath;
  try {
    realPath = await fs.realpath(dirPath);
  } catch {
    // Fallback
  }

  if (visitedDirs.has(realPath)) return;
  visitedDirs.add(realPath);

  await dirSemaphore.acquire();
  
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    dirSemaphore.release();
    return;
  }

  foldersScanned++;
  reportProgress(dirPath);

  // Add the directory entry immediately
  allItems.push({
    path: dirPath,
    name: path.basename(dirPath) || dirPath,
    size: 0, // Assigned at the end
    modifiedTime: Date.now(),
    isDir: true,
    type: 'folder',
    depth
  });

  dirSemaphore.release();

  const filePromises: Promise<void>[] = [];
  const dirPromises: Promise<void>[] = [];

  for (const entry of entries) {
    if (isStopped) break;
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isSymbolicLink()) continue;

    if (entry.isDirectory()) {
      dirPromises.push(scanDir(fullPath, depth + 1));
    } else if (entry.isFile()) {
      filePromises.push((async () => {
        await statSemaphore.acquire();
        try {
          const stat = await fs.stat(fullPath);
          const size = stat.size;
          bytesScanned += size;
          filesScanned++;

          addSizeToAncestors(fullPath, size);

          // Only keep files >= 100KB to protect V8 memory limits and prevent frontend lag/crashes
          if (size >= 102400) {
            allItems.push({
              path: fullPath,
              name: entry.name,
              size,
              modifiedTime: stat.mtimeMs,
              isDir: false,
              type: getFileType(entry.name),
              depth: depth + 1
            });
          }
        } catch {
          // File read error
        } finally {
          statSemaphore.release();
        }
      })());
    }
  }

  await Promise.all([...filePromises, ...dirPromises]);
}

async function startScan() {
  const startTime = Date.now();

  parentPort?.on('message', (msg) => {
    if (msg.type === 'stop') {
      isStopped = true;
    }
  });

  await scanDir(rootPath, 0);

  if (isStopped) {
    parentPort?.postMessage({ type: 'stopped' });
    return;
  }

  // Populate actual directory sizes from our ancestor map
  for (const item of allItems) {
    if (item.isDir) {
      item.size = folderSizes.get(item.path) || 0;
    }
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

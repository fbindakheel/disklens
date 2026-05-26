import { parentPort, workerData } from 'worker_threads';
import * as fs from 'fs';
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

interface StackItem {
  dirPath: string;
  depth: number;
}

const stack: StackItem[] = [{ dirPath: rootPath, depth: 0 }];
const visitedDirs = new Set<string>();

async function startScan() {
  const startTime = Date.now();
  let lastYieldTime = Date.now();

  parentPort?.on('message', (msg) => {
    if (msg.type === 'stop') {
      isStopped = true;
    }
  });

  while (stack.length > 0 && !isStopped) {
    const { dirPath, depth } = stack.pop()!;

    try {
      let realPath = dirPath;
      try {
        realPath = fs.realpathSync(dirPath);
      } catch {
        // Fallback
      }

      if (visitedDirs.has(realPath)) continue;
      visitedDirs.add(realPath);

      foldersScanned++;
      reportProgress(dirPath);

      // Periodically yield to event loop (every 50ms) to process stop message and keep UI responsive
      const now = Date.now();
      if (now - lastYieldTime > 50) {
        await new Promise((resolve) => setImmediate(resolve));
        lastYieldTime = Date.now();
      }

      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (isStopped) break;
        const fullPath = path.join(dirPath, entry.name);

        try {
          if (entry.isSymbolicLink()) {
            continue;
          }

          if (entry.isDirectory()) {
            stack.push({ dirPath: fullPath, depth: depth + 1 });
            allItems.push({
              path: fullPath,
              name: entry.name,
              size: 0,
              modifiedTime: 0,
              isDir: true,
              type: 'folder',
              depth: depth + 1
            });
          } else if (entry.isFile()) {
            const stat = fs.statSync(fullPath);
            const size = stat.size;
            const mtime = stat.mtimeMs;
            const type = getFileType(entry.name);

            allItems.push({
              path: fullPath,
              name: entry.name,
              size,
              modifiedTime: mtime,
              isDir: false,
              type,
              depth
            });

            filesScanned++;
            bytesScanned += size;
          }
        } catch {
          // Inaccessible individual file/directory
        }
      }
    } catch {
      // Inaccessible directory
    }
  }

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

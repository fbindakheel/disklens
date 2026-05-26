import * as fs from 'fs/promises';
import * as crypto from 'crypto';

export interface DuplicateGroup {
  hash: string;
  size: number;
  paths: string[];
}

export async function findDuplicates(
  items: any[],
  onProgress: (current: number, total: number) => void
): Promise<Record<string, string[]>> {
  // Group by size first
  const sizeMap = new Map<number, any[]>();
  for (const item of items) {
    if (item.isDir || item.size === 0) continue;
    
    let list = sizeMap.get(item.size);
    if (!list) {
      list = [];
      sizeMap.set(item.size, list);
    }
    list.push(item);
  }

  // Filter sizes with multiple files
  const candidates: any[] = [];
  for (const [size, list] of sizeMap.entries()) {
    if (list.length > 1) {
      candidates.push(...list);
    }
  }

  const total = candidates.length;
  let current = 0;
  const duplicates: Record<string, string[]> = {};
  const hashMap = new Map<string, string[]>();

  for (const item of candidates) {
    current++;
    if (current % 10 === 0 || current === total) {
      onProgress(current, total);
    }

    try {
      // MD5 of first 64KB
      const fd = await fs.open(item.path, 'r');
      const buffer = Buffer.alloc(65536);
      const { bytesRead } = await fd.read(buffer, 0, 65536, 0);
      await fd.close();

      const hash = crypto.createHash('md5').update(buffer.subarray(0, bytesRead)).digest('hex') + '_' + item.size;
      
      let list = hashMap.get(hash);
      if (!list) {
        list = [];
        hashMap.set(hash, list);
      }
      list.push(item.path);
    } catch {
      // Inaccessible
    }
  }

  for (const [hash, paths] of hashMap.entries()) {
    if (paths.length > 1) {
      duplicates[hash] = paths;
    }
  }

  return duplicates;
}

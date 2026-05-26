import { shell } from 'electron';
import * as fs from 'fs/promises';

export interface DeleteResult {
  path: string;
  success: boolean;
  error?: string;
}

export async function safeDelete(paths: string[]): Promise<DeleteResult[]> {
  const results: DeleteResult[] = [];
  for (const p of paths) {
    try {
      await shell.trashItem(p);
      results.push({ path: p, success: true });
    } catch (err: any) {
      try {
        await fs.rm(p, { recursive: true, force: true });
        results.push({ path: p, success: true });
      } catch (innerErr: any) {
        results.push({ path: p, success: false, error: innerErr.message });
      }
    }
  }
  return results;
}

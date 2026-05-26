import { Worker } from 'worker_threads';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class MacScanner {
  private worker: Worker | null = null;

  async getDiskMetadata(rootPath: string): Promise<any> {
    try {
      const { stdout } = await execAsync(`diskutil info "${rootPath}"`);
      return stdout;
    } catch {
      return null;
    }
  }

  start(
    rootPath: string,
    onProgress: (progress: any) => void,
    onComplete: (result: any) => void,
    onError: (err: any) => void
  ) {
    const workerPath = path.join(__dirname, 'scanner/worker.js');
    this.worker = new Worker(workerPath, {
      workerData: { rootPath }
    });

    this.worker.on('message', (msg) => {
      if (msg.type === 'progress') {
        onProgress(msg.data);
      } else if (msg.type === 'complete') {
        onComplete(msg.data);
      } else if (msg.type === 'stopped') {
        this.worker = null;
      }
    });

    this.worker.on('error', onError);
  }

  stop() {
    if (this.worker) {
      this.worker.postMessage({ type: 'stop' });
    }
  }
}

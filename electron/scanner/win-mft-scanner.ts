import { Worker } from 'worker_threads';
import * as path from 'path';
import { exec } from 'child_process';

export class WinMftScanner {
  private worker: Worker | null = null;

  // Simple command execution check to see if we are Administrator
  async checkAdmin(): Promise<boolean> {
    return new Promise((resolve) => {
      exec('net session', (err) => {
        resolve(!err);
      });
    });
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

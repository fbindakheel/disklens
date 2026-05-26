import React from 'react';
import { useDiskStore } from '../../store/diskStore';

export default function StatusBar() {
  const { allItems, scanHeader, scanProgress, isScanning } = useDiskStore();

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStats = () => {
    if (isScanning && scanProgress) {
      return {
        files: scanProgress.filesScanned,
        folders: scanProgress.foldersScanned,
        size: scanProgress.bytesScanned,
        label: 'Scanning...'
      };
    }
    if (scanHeader) {
      return {
        files: scanHeader.totalFiles,
        folders: scanHeader.totalFolders,
        size: scanHeader.totalSize,
        label: 'Scan Completed'
      };
    }
    return null;
  };

  const stats = getStats();

  return (
    <div className="h-8 border-t border-slate-500/10 flex items-center justify-between px-4 text-xs font-bold text-slate-500 dark:text-slate-400 select-none bg-slate-900/10 dark:bg-slate-950/20">
      <div>
        {stats ? (
          <span>
            {stats.label} | {stats.files.toLocaleString()} files | {stats.folders.toLocaleString()} folders
          </span>
        ) : (
          <span>Ready to Scan</span>
        )}
      </div>

      <div>
        {stats && (
          <span>
            Total size: <span className="text-teal-500 dark:text-teal-400 font-extrabold">{formatSize(stats.size)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

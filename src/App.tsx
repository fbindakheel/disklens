import React, { useMemo, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import StatusBar from './components/layout/StatusBar';
import TreemapView from './components/views/TreemapView';
import TableView from './components/views/TableView';
import TopFilesView from './components/views/TopFilesView';
import DuplicatesView from './components/views/DuplicatesView';
import CleanupView from './components/views/CleanupView';
import HeatmapView from './components/views/HeatmapView';
import HistoryView from './components/views/HistoryView';
import { useDiskStore } from './store/diskStore';
import { buildTree } from './utils/treemap';

export default function App() {
  const { 
    activeTab, 
    isScanning, 
    scanProgress, 
    scanTime, 
    scanHeader, 
    allItems, 
    duplicates,
    scanError,
    setAllItems,
    setDuplicates,
    setScanHeader,
    darkMode
  } = useDiskStore();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filesPerSec = useMemo(() => {
    if (!scanProgress || scanTime === 0) return 0;
    return Math.floor(scanProgress.filesScanned / scanTime);
  }, [scanProgress, scanTime]);

  const rootNode = useMemo(() => {
    if (allItems.length === 0 || !scanHeader) return null;
    return buildTree(allItems, scanHeader.path);
  }, [allItems, scanHeader]);

  const handleRefreshAfterDelete = (deletedPaths: string[]) => {
    const isWindows = scanHeader?.path.includes('\\');
    const sep = isWindows ? '\\' : '/';

    const updatedItems = allItems.filter((item) => {
      return !deletedPaths.some((p) => {
        return item.path === p || item.path.startsWith(p + sep);
      });
    });

    const updatedDuplicates: Record<string, string[]> = {};
    for (const [hash, paths] of Object.entries(duplicates)) {
      const nextPaths = paths.filter(p => !deletedPaths.some(dp => p === dp || p.startsWith(dp + sep)));
      if (nextPaths.length > 1) {
        updatedDuplicates[hash] = nextPaths;
      }
    }

    setAllItems(updatedItems);
    setDuplicates(updatedDuplicates);

    if (scanHeader) {
      const folders = updatedItems.filter(i => i.isDir).length;
      const files = updatedItems.filter(i => !i.isDir).length;
      const size = updatedItems.filter(i => !i.isDir).reduce((sum, i) => sum + i.size, 0);

      setScanHeader({
        ...scanHeader,
        totalFolders: folders,
        totalFiles: files,
        totalSize: size
      });
    }
  };

  return (
    <div className="flex h-screen w-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden p-6">
        <TopBar />

        {isScanning && scanProgress && (
          <div className="glass-panel rounded-2xl p-4 mb-6 border border-slate-500/10 flex flex-col space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400 truncate max-w-lg">
                Scanning: {scanProgress.currentFolder}
              </span>
              <span className="font-bold text-teal-500">
                {scanProgress.filesScanned.toLocaleString()} files scanned
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-teal-500 h-full w-[45%] animate-pulse" />
            </div>
            <div className="grid grid-cols-4 gap-4 pt-1.5 text-center text-xs text-slate-500 dark:text-slate-400">
              <div>
                <span className="block font-black text-slate-800 dark:text-slate-200 text-sm">
                  {formatSize(scanProgress.bytesScanned)}
                </span>
                Size
              </div>
              <div>
                <span className="block font-black text-slate-800 dark:text-slate-200 text-sm">
                  {scanProgress.foldersScanned.toLocaleString()}
                </span>
                Folders
              </div>
              <div>
                <span className="block font-black text-slate-800 dark:text-slate-200 text-sm">
                  {filesPerSec.toLocaleString()}
                </span>
                Files/sec
              </div>
              <div>
                <span className="block font-black text-slate-800 dark:text-slate-200 text-sm">
                  {scanTime}s
                </span>
                Duration
              </div>
            </div>
          </div>
        )}

        {scanError && (
          <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4 mb-6 text-red-400 text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4" />
            <span>Error during scan: {scanError}</span>
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0">
          {!scanHeader && !isScanning ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="h-16 w-16 text-teal-600/40 animate-bounce flex items-center justify-center text-3xl font-black rounded-3xl bg-slate-800/20">
                DL
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-700 dark:text-slate-350">DiskLens Space Analyzer</h3>
                <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 max-w-xs">
                  Choose a target disk path above and click 'Scan Drive' to map file structures.
                </p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && rootNode && (
                <div className="flex-1 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 min-h-0">
                  <div className="flex-1 flex flex-col min-h-0">
                    <TreemapView rootNode={rootNode} />
                  </div>
                  <div className="flex-1 flex flex-col min-h-0">
                    <TableView onRefreshAfterDelete={handleRefreshAfterDelete} />
                  </div>
                </div>
              )}

              {activeTab === 'duplicates' && (
                <DuplicatesView onRefreshAfterDelete={handleRefreshAfterDelete} />
              )}

              {activeTab === 'cleanup' && (
                <CleanupView onRefreshAfterDelete={handleRefreshAfterDelete} />
              )}

              {activeTab === 'heatmap' && (
                <HeatmapView onRefreshAfterDelete={handleRefreshAfterDelete} />
              )}

              {activeTab === 'history' && (
                <HistoryView />
              )}
            </>
          )}
        </div>

        <StatusBar />
      </div>
    </div>
  );
}

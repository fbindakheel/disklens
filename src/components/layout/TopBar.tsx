import React from 'react';
import { FolderOpen, Play, Square, Share2, Download } from 'lucide-react';
import { useDiskStore } from '../../store/diskStore';
import { useScanner } from '../../hooks/useScanner';

export default function TopBar() {
  const { 
    scanPath, 
    setScanPath, 
    isScanning, 
    scanHeader, 
    allItems 
  } = useDiskStore();
  
  const { startScan, stopScan } = useScanner();

  const handleSelectDirectory = async () => {
    try {
      const dir = await window.electronAPI.selectDirectory();
      if (dir) {
        setScanPath(dir);
      }
    } catch (err) {
      console.error('Failed to select directory', err);
    }
  };

  const handleExport = async (type: 'csv' | 'json' | 'html') => {
    if (!scanHeader || allItems.length === 0) return;
    
    const reportData = {
      title: `DiskLens Scan Report - ${scanHeader.path}`,
      date: new Date(scanHeader.timestamp).toLocaleString(),
      rootPath: scanHeader.path,
      totalSize: scanHeader.totalSize,
      totalFiles: scanHeader.totalFiles,
      totalFolders: scanHeader.totalFolders,
      items: allItems
    };

    const success = await window.electronAPI.exportReport(type, reportData);
    if (success) {
      alert(`Report exported successfully!`);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 flex items-center justify-between space-x-4 mb-6 border border-slate-500/10">
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        <button
          onClick={handleSelectDirectory}
          disabled={isScanning}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-all flex-shrink-0"
          title="Browse folder"
        >
          <FolderOpen className="h-5 w-5" />
        </button>
        <input
          type="text"
          value={scanPath}
          onChange={(e) => setScanPath(e.target.value)}
          disabled={isScanning}
          className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-sm font-bold text-slate-805 dark:text-slate-100 placeholder-slate-400 truncate"
          placeholder="Enter drive or folder path (e.g. C:\ or /)"
        />
      </div>

      <div className="flex items-center space-x-2 flex-shrink-0">
        {isScanning ? (
          <button
            onClick={stopScan}
            className="flex items-center space-x-1.5 px-5 py-2.5 bg-red-600 hover:bg-red-755 text-white rounded-xl text-xs font-bold shadow-md transition-all animate-pulse"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            <span>Stop Scan</span>
          </button>
        ) : (
          <button
            onClick={startScan}
            className="flex items-center space-x-1.5 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Scan Drive</span>
          </button>
        )}

        {scanHeader && (
          <div className="relative group">
            <button className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center">
              <Share2 className="h-4.5 w-4.5" />
            </button>
            <div className="absolute right-0 top-11 z-50 bg-slate-900 border border-slate-800 rounded-xl py-1.5 shadow-2xl min-w-[130px] hidden group-hover:block">
              <button
                onClick={() => handleExport('csv')}
                className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 text-left"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 text-left"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={() => handleExport('html')}
                className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 text-left"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export HTML</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

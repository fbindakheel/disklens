import React, { useMemo } from 'react';
import { File, Eye, Trash2, ShieldAlert } from 'lucide-react';
import { useDiskStore } from '../../store/diskStore';

interface TopFilesViewProps {
  onRefreshAfterDelete: (deletedPaths: string[]) => void;
}

export default function TopFilesView({ onRefreshAfterDelete }: TopFilesViewProps) {
  const { allItems } = useDiskStore();

  const top100Files = useMemo(() => {
    return allItems
      .filter(item => !item.isDir)
      .sort((a, b) => b.size - a.size)
      .slice(0, 100);
  }, [allItems]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSingleDelete = async (path: string, name: string) => {
    const confirm = window.confirm(`Move "${name}" to Trash?`);
    if (!confirm) return;

    const results = await window.electronAPI.deletePaths([path]);
    if (results[0].success) {
      onRefreshAfterDelete([path]);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/10 dark:bg-slate-900/30 rounded-2xl border border-slate-500/10 p-5 overflow-hidden">
      <div className="mb-5">
        <h2 className="text-xl font-bold flex items-center space-x-2 text-slate-805 dark:text-slate-100">
          <ShieldAlert className="h-5.5 w-5.5 text-teal-500" />
          <span>Top 100 Largest Files</span>
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          A flattened list of the largest files across your scanned directory.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto border border-slate-500/10 rounded-xl pr-1">
        {top100Files.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs">
            No files found
          </div>
        ) : (
          <div className="divide-y divide-slate-500/10">
            {top100Files.map((file, index) => (
              <div key={file.path} className="flex items-center justify-between p-3.5 text-xs hover:bg-slate-500/5 transition-colors">
                <div className="flex items-center space-x-3 min-w-0 flex-1 mr-4">
                  <span className="font-bold text-slate-400 w-6 text-right">#{index + 1}</span>
                  <File className="h-4 w-4 text-teal-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div 
                      className="font-bold truncate text-slate-850 dark:text-slate-200 cursor-pointer hover:text-teal-500"
                      onClick={() => window.electronAPI.openFile(file.path)}
                    >
                      {file.name}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate max-w-full font-mono mt-0.5">
                      {file.path}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 flex-shrink-0">
                  <span className="font-bold text-slate-800 dark:text-slate-300">
                    {formatSize(file.size)}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    Touched: {new Date(file.modifiedTime).toLocaleDateString()}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <button 
                      onClick={() => window.electronAPI.showItemInFolder(file.path)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-850 rounded text-slate-400 hover:text-slate-200"
                      title="Reveal in Finder"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => handleSingleDelete(file.path, file.name)}
                      className="p-1 hover:bg-slate-202 dark:hover:bg-slate-850 rounded text-slate-400 hover:text-red-400"
                      title="Delete file"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

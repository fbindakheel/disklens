import React, { useState, useMemo } from 'react';
import { Trash2, ShieldAlert, Sparkles, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { useDiskStore } from '../../store/diskStore';
import { useDuplicates } from '../../hooks/useDuplicates';

interface FileItem {
  path: string;
  name: string;
  size: number;
  modifiedTime: number;
  isDir: boolean;
  type: string;
}

interface DuplicatesViewProps {
  onRefreshAfterDelete: (deletedPaths: string[]) => void;
}

export default function DuplicatesView({ onRefreshAfterDelete }: DuplicatesViewProps) {
  const { allItems, duplicates } = useDiskStore();
  const { findDuplicates, isHashing, progress } = useDuplicates();
  const [selectedPaths, setSelectedPaths] = useState<Record<string, boolean>>({});

  const pathMap = useMemo(() => {
    const map = new Map<string, FileItem>();
    for (const item of allItems) {
      map.set(item.path, item);
    }
    return map;
  }, [allItems]);

  const duplicateGroups = useMemo(() => {
    const groups = [];
    
    for (const [hash, paths] of Object.entries(duplicates)) {
      const groupItems = paths
        .map(p => pathMap.get(p))
        .filter((item): item is FileItem => !!item);
      
      if (groupItems.length > 1) {
        const size = groupItems[0].size;
        const totalSize = size * groupItems.length;
        const wastedSize = size * (groupItems.length - 1);
        
        groups.push({
          hash,
          size,
          totalSize,
          wastedSize,
          items: groupItems.sort((a, b) => b.modifiedTime - a.modifiedTime)
        });
      }
    }
    
    return groups.sort((a, b) => b.wastedSize - a.wastedSize);
  }, [duplicates, pathMap]);

  const totalWastedSpace = useMemo(() => {
    return duplicateGroups.reduce((sum, g) => sum + g.wastedSize, 0);
  }, [duplicateGroups]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleSelect = (path: string) => {
    setSelectedPaths(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const selectAllDuplicates = () => {
    const next: Record<string, boolean> = {};
    for (const group of duplicateGroups) {
      for (let i = 1; i < group.items.length; i++) {
        next[group.items[i].path] = true;
      }
    }
    setSelectedPaths(next);
  };

  const handleBulkDelete = async () => {
    const targets = Object.keys(selectedPaths).filter(p => selectedPaths[p]);
    if (targets.length === 0) return;

    const confirm = window.confirm(`Move selected ${targets.length} duplicate file(s) to Trash?`);
    if (!confirm) return;

    const results = await window.electronAPI.deletePaths(targets);
    const successfullyDeleted = results.filter((r: any) => r.success).map((r: any) => r.path);

    if (successfullyDeleted.length > 0) {
      onRefreshAfterDelete(successfullyDeleted);
      setSelectedPaths({});
    }
  };

  // Estimate remaining time based on remaining items to hash (assume 120 files/sec hashing)
  const estimatedTimeRemaining = useMemo(() => {
    if (!progress) return '';
    const remaining = progress.total - progress.current;
    const seconds = Math.ceil(remaining / 120);
    return `${seconds}s remaining`;
  }, [progress]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/10 dark:bg-slate-900/30 rounded-2xl border border-slate-500/10 p-5 overflow-hidden">
      
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center space-x-2 text-slate-800 dark:text-slate-100">
            <ShieldAlert className="h-5.5 w-5.5 text-teal-555" />
            <span>Duplicate File Finder</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Scan and index files matching sizes, verified with MD5/SHA256.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={findDuplicates}
            disabled={isHashing || allItems.length === 0}
            className="flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-all shadow disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isHashing ? 'animate-spin' : ''}`} />
            <span>{isHashing ? 'Hashing Files...' : 'Find Duplicates'}</span>
          </button>

          {duplicateGroups.length > 0 && (
            <button
              onClick={selectAllDuplicates}
              className="flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
            >
              <Sparkles className="h-4 w-4 text-teal-550" />
              <span>Select Duplicates</span>
            </button>
          )}

          {Object.values(selectedPaths).filter(Boolean).length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold bg-red-500/20 hover:bg-red-500/35 border border-red-500/30 text-red-400 rounded-xl transition-all"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Selected ({Object.values(selectedPaths).filter(Boolean).length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress display */}
      {isHashing && progress && (
        <div className="glass-panel rounded-2xl p-4 mb-5 border border-slate-500/10">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="font-bold text-slate-400">Verifying file hashes...</span>
            <span className="text-teal-400 font-bold">{progress.current} / {progress.total} candidates | {estimatedTimeRemaining}</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-teal-500 h-full transition-all duration-150" 
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Group listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="glass-panel rounded-2xl p-4">
          <span className="text-xs font-bold text-slate-400 uppercase">Wasted space</span>
          <span className="text-2xl font-black text-teal-500 mt-2 block">{formatSize(totalWastedSpace)}</span>
        </div>
        <div className="glass-panel rounded-2xl p-4">
          <span className="text-xs font-bold text-slate-400 uppercase">Duplicate groups</span>
          <span className="text-2xl font-black text-slate-400 mt-2 block">{duplicateGroups.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {duplicateGroups.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            {isHashing ? 'Analyzing candidates...' : 'Click "Find Duplicates" to start scan.'}
          </div>
        ) : (
          duplicateGroups.map((group) => (
            <div key={group.hash} className="glass-panel rounded-2xl p-4 flex flex-col border border-slate-500/10">
              <div className="flex items-center justify-between border-b border-slate-500/10 pb-3 mb-3 flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm truncate max-w-[200px] text-slate-800 dark:text-slate-100">
                    {group.items[0].name}
                  </span>
                  <span className="text-[10px] bg-slate-202 dark:bg-slate-850 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                    {group.hash.split('_')[0].substring(0, 8)}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Size: <span className="text-slate-200 font-bold">{formatSize(group.size)}</span> each | Wasted: <span className="text-teal-400 font-black">{formatSize(group.wastedSize)}</span>
                </div>
              </div>

              <div className="space-y-2">
                {group.items.map((item, idx) => {
                  const isSelected = selectedPaths[item.path] || false;
                  return (
                    <div 
                      key={item.path} 
                      className={`flex items-center justify-between p-2 rounded-xl text-xs hover:bg-slate-500/5 ${idx === 0 ? 'border-l-2 border-teal-500 bg-teal-500/5' : ''}`}
                    >
                      <div className="flex items-center space-x-2 min-w-0 flex-1 mr-4">
                        <button 
                          onClick={() => toggleSelect(item.path)}
                          className="text-slate-400 hover:text-teal-500 transition-colors"
                        >
                          {isSelected ? <CheckSquare className="h-4 w-4 text-teal-500" /> : <Square className="h-4 w-4" />}
                        </button>
                        <span className="truncate text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                          {item.path}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-3 flex-shrink-0">
                        <span className="text-slate-400 text-[10px]">
                          Modified: {new Date(item.modifiedTime).toLocaleDateString()}
                        </span>
                        {idx === 0 && (
                          <span className="text-[9px] bg-teal-500/20 text-teal-400 border border-teal-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                            Keep (Newest)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

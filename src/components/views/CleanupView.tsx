import React, { useState, useEffect } from 'react';
import { Trash2, Sparkles, FolderSync, Database, Clock, FileWarning, Eye, AlertCircle, Plus, Check, RefreshCw } from 'lucide-react';
import { useDiskStore } from '../../store/diskStore';

interface CleanupViewProps {
  onRefreshAfterDelete: (deletedPaths: string[]) => void;
}

export default function CleanupView({ onRefreshAfterDelete }: CleanupViewProps) {
  const { allItems, whitelist, addToWhitelist, removeFromWhitelist } = useDiskStore();
  const [categories, setCategories] = useState<any[]>([]);
  const [isCleaning, setIsCleaning] = useState<string | null>(null);

  // Trigger junk detection via IPC or local mapping
  useEffect(() => {
    if (allItems.length === 0) return;
    window.electronAPI.detectJunkFiles(allItems).then((data: any[]) => {
      // Filter out items in the whitelist
      const filtered = data.map((cat: any) => ({
        ...cat,
        paths: cat.paths.filter((p: string) => !whitelist.includes(p))
      })).filter((cat: any) => cat.paths.length > 0);

      // Re-calculate sizes
      const categoriesWithSizes = filtered.map((cat: any) => {
        let totalSize = 0;
        for (const p of cat.paths) {
          const matching = allItems.filter(item => item.path === p || item.path.startsWith(p + (p.includes('\\') ? '\\' : '/')));
          totalSize += matching.reduce((sum, i) => sum + (i.isDir ? 0 : i.size), 0);
        }
        return {
          ...cat,
          totalSize
        };
      });

      setCategories(categoriesWithSizes);
    });
  }, [allItems, whitelist]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCleanCategory = async (cat: any) => {
    const confirm = window.confirm(`Are you sure you want to clean up "${cat.name}"?\nThis will clear estimated ${formatSize(cat.totalSize)} space.`);
    if (!confirm) return;

    setIsCleaning(cat.id);
    try {
      const results = await window.electronAPI.deletePaths(cat.paths);
      const successfullyDeleted = results.filter((r: any) => r.success).map((r: any) => r.path);
      if (successfullyDeleted.length > 0) {
        onRefreshAfterDelete(successfullyDeleted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCleaning(null);
    }
  };

  const totalReclaimable = categories.reduce((sum, c) => sum + c.totalSize, 0);

  const getIcon = (id: string) => {
    switch (id) {
      case 'node_modules': return FolderSync;
      case 'xcode': return Database;
      case 'simulators': return Clock;
      case 'logs': return FileWarning;
      default: return Database;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/10 dark:bg-slate-900/30 rounded-2xl border border-slate-500/10 p-5 overflow-hidden">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center space-x-2 text-slate-808 dark:text-slate-100">
            <Sparkles className="h-5.5 w-5.5 text-teal-500" />
            <span>Smart Cleanup Engine</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Reclaim space by cleaning up system caches, log archives, and development assets.
          </p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5 mb-6 flex items-center justify-between border-l-4 border-l-teal-500">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase">Estimated space recoverable</span>
          <div className="text-3xl font-black text-teal-500 mt-1">
            {formatSize(totalReclaimable)}
          </div>
        </div>
        <Trash2 className="h-10 w-10 text-slate-500/20" />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {categories.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            No cleanup items found. Your disk is optimized!
          </div>
        ) : (
          categories.map((cat) => {
            const Icon = getIcon(cat.id);
            const isCategoryCleaning = isCleaning === cat.id;

            return (
              <div 
                key={cat.id} 
                className="glass-panel rounded-2xl p-5 border border-slate-500/10 flex items-center justify-between hover:border-slate-500/20 transition-all duration-150"
              >
                <div className="flex items-center space-x-4 min-w-0 flex-1 pr-6">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-teal-500 flex-shrink-0">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{cat.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cat.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded-full text-slate-500">
                        {cat.paths.length} items
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-3 flex-shrink-0">
                  <span className="text-lg font-black text-slate-800 dark:text-slate-105 font-mono">
                    {formatSize(cat.totalSize)}
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => cat.paths.forEach((p: string) => addToWhitelist(p))}
                      className="flex items-center space-x-1 px-2.5 py-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
                      title="Add to Whitelist"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Exclude</span>
                    </button>
                    
                    <button
                      onClick={() => handleCleanCategory(cat)}
                      disabled={isCategoryCleaning}
                      className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-all"
                    >
                      {isCategoryCleaning ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      <span>{isCategoryCleaning ? 'Cleaning...' : 'Clean category'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

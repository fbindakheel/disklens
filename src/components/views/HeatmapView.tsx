import React, { useState, useMemo } from 'react';
import { Calendar, AlertCircle, Trash2, Eye } from 'lucide-react';
import { useDiskStore } from '../../store/diskStore';

interface HeatmapViewProps {
  onRefreshAfterDelete: (deletedPaths: string[]) => void;
}

export default function HeatmapView({ onRefreshAfterDelete }: HeatmapViewProps) {
  const { allItems } = useDiskStore();
  const [filterYear, setFilterYear] = useState<number>(2023);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Group files by age categories
  const ageDistribution = useMemo(() => {
    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    const sixMonths = 180 * 24 * 60 * 60 * 1000;
    const twoYears = 2 * 365 * 24 * 60 * 60 * 1000;

    let fresh = 0, recent = 0, stale = 0, dead = 0;
    let freshSize = 0, recentSize = 0, staleSize = 0, deadSize = 0;

    for (const item of allItems) {
      if (item.isDir) continue;

      const age = now - item.modifiedTime;
      if (age < oneMonth) {
        fresh++;
        freshSize += item.size;
      } else if (age < sixMonths) {
        recent++;
        recentSize += item.size;
      } else if (age < twoYears) {
        stale++;
        staleSize += item.size;
      } else {
        dead++;
        deadSize += item.size;
      }
    }

    const totalFiles = fresh + recent + stale + dead || 1;
    const totalSize = freshSize + recentSize + staleSize + deadSize || 1;

    return {
      fresh: { count: fresh, size: freshSize, countPct: (fresh / totalFiles) * 100, sizePct: (freshSize / totalSize) * 105 },
      recent: { count: recent, size: recentSize, countPct: (recent / totalFiles) * 100, sizePct: (recentSize / totalSize) * 100 },
      stale: { count: stale, size: staleSize, countPct: (stale / totalFiles) * 100, sizePct: (staleSize / totalSize) * 100 },
      dead: { count: dead, size: deadSize, countPct: (dead / totalFiles) * 100, sizePct: (deadSize / totalSize) * 100 }
    };
  }, [allItems]);

  // Dead files not modified since selected filter year
  const filteredDeadFiles = useMemo(() => {
    const limitTimestamp = new Date(`${filterYear}-01-01`).getTime();

    return allItems
      .filter(item => !item.isDir && item.modifiedTime < limitTimestamp)
      .sort((a, b) => b.size - a.size)
      .slice(0, 100);
  }, [allItems, filterYear]);

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
      <div className="mb-5 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center space-x-2 text-slate-805 dark:text-slate-100">
            <Calendar className="h-5.5 w-5.5 text-teal-500" />
            <span>File Age Heatmap & Dead Files</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Locate old large assets that haven't been accessed or modified in years.
          </p>
        </div>

        {/* Recency Year Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Show files untouched since:</span>
          <select 
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="text-xs bg-slate-100 dark:bg-slate-900 border border-slate-350 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
            <option value={2023}>2023</option>
            <option value={2022}>2022</option>
            <option value={2021}>2021</option>
          </select>
        </div>
      </div>

      {/* Heatmap Visual segment */}
      <div className="glass-panel rounded-2xl p-5 mb-6">
        <span className="text-xs font-bold text-slate-400 uppercase">Age Distribution of Disk Space</span>
        <div className="flex h-8 w-full rounded-xl overflow-hidden mt-3 relative">
          <div 
            style={{ width: `${ageDistribution.fresh.sizePct}%` }} 
            className="bg-green-500 h-full hover:opacity-85 transition-opacity" 
            title={`Fresh (<1m): ${formatSize(ageDistribution.fresh.size)}`}
          />
          <div 
            style={{ width: `${ageDistribution.recent.sizePct}%` }} 
            className="bg-teal-500 h-full hover:opacity-85 transition-opacity"
            title={`Recent (1m-6m): ${formatSize(ageDistribution.recent.size)}`}
          />
          <div 
            style={{ width: `${ageDistribution.stale.sizePct}%` }} 
            className="bg-orange-500 h-full hover:opacity-85 transition-opacity"
            title={`Stale (6m-2y): ${formatSize(ageDistribution.stale.size)}`}
          />
          <div 
            style={{ width: `${ageDistribution.dead.sizePct}%` }} 
            className="bg-red-500 h-full hover:opacity-85 transition-opacity"
            title={`Dead (>2y): ${formatSize(ageDistribution.dead.size)}`}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-xs font-medium">
          <div className="flex flex-col">
            <span className="flex items-center text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 mr-1.5" />
              <span>Fresh (&lt; 1 month)</span>
            </span>
            <span className="text-slate-500 mt-1 font-bold">{formatSize(ageDistribution.fresh.size)} ({ageDistribution.fresh.sizePct.toFixed(1)}%)</span>
          </div>
          <div className="flex flex-col">
            <span className="flex items-center text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 mr-1.5" />
              <span>Recent (1 - 6 months)</span>
            </span>
            <span className="text-slate-500 mt-1 font-bold">{formatSize(ageDistribution.recent.size)} ({ageDistribution.recent.sizePct.toFixed(1)}%)</span>
          </div>
          <div className="flex flex-col">
            <span className="flex items-center text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 mr-1.5" />
              <span>Stale (6m - 2 years)</span>
            </span>
            <span className="text-slate-500 mt-1 font-bold">{formatSize(ageDistribution.stale.size)} ({ageDistribution.stale.sizePct.toFixed(1)}%)</span>
          </div>
          <div className="flex flex-col">
            <span className="flex items-center text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1.5" />
              <span>Dead (2+ years)</span>
            </span>
            <span className="text-slate-500 mt-1 font-bold text-red-400">{formatSize(ageDistribution.dead.size)} ({ageDistribution.dead.sizePct.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center space-x-2 mb-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Untouched Files (since {filterYear})</h3>
        </div>

        <div className="flex-1 overflow-y-auto border border-slate-500/10 rounded-xl pr-1">
          {allItems.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm font-semibold">
              Please run a scan first to view the file age heatmap.
            </div>
          ) : filteredDeadFiles.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
              No files found untouched since {filterYear}
            </div>
          ) : (
            <div className="divide-y divide-slate-500/10">
              {filteredDeadFiles.map((file) => (
                <div key={file.path} className="flex items-center justify-between p-3.5 text-xs hover:bg-slate-500/5 transition-colors">
                  <div className="flex items-center space-x-3 min-w-0 flex-1 mr-4">
                    <div className="min-w-0">
                      <div 
                        className="font-bold truncate text-slate-800 dark:text-slate-200 cursor-pointer hover:text-teal-500"
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
                    <span className="font-semibold text-slate-700 dark:text-slate-350">
                      {formatSize(file.size)}
                    </span>
                    <span className="text-slate-550 text-[10px]">
                      Touched: {new Date(file.modifiedTime).toLocaleDateString()}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button 
                        onClick={() => window.electronAPI.showItemInFolder(file.path)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => handleSingleDelete(file.path, file.name)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-red-400"
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
    </div>
  );
}

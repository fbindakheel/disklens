import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { History, TrendingUp, RefreshCw, Folder, Download } from 'lucide-react';
import { useDiskStore } from '../../store/diskStore';
import { useHistory } from '../../hooks/useHistory';

export default function HistoryView() {
  const { scanHeader, allItems } = useDiskStore();
  const { history, loading, refreshHistory } = useHistory();
  const [comparisonTargetId, setComparisonTargetId] = useState<string>('');
  const [comparisonItems, setComparisonItems] = useState<any[] | null>(null);

  useEffect(() => {
    if (history.length > 1) {
      setComparisonTargetId(history[history.length - 2].id);
    }
  }, [history]);

  useEffect(() => {
    if (!comparisonTargetId) {
      setComparisonItems(null);
      return;
    }
    window.electronAPI.getScanDetails(comparisonTargetId).then((details: any[] | null) => {
      setComparisonItems(details);
    });
  }, [comparisonTargetId]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const chartData = useMemo(() => {
    return history.map(item => ({
      name: new Date(item.timestamp).toLocaleDateString(),
      sizeGB: parseFloat((item.totalSize / 1024 / 1024 / 1024).toFixed(2)),
      sizeText: formatSize(item.totalSize),
      files: item.totalFiles
    }));
  }, [history]);

  const growthList = useMemo(() => {
    if (!comparisonItems || !allItems || allItems.length === 0) return [];

    const pastMap = new Map<string, number>();
    for (const item of comparisonItems) {
      if (item.isDir) {
        pastMap.set(item.path, item.size);
      }
    }

    const growth = [];
    for (const item of allItems) {
      if (item.isDir) {
        const pastSize = pastMap.get(item.path) || 0;
        const delta = item.size - pastSize;
        if (delta > 5 * 1024 * 1024) { // folders that grew by 5MB+
          growth.push({
            path: item.path,
            name: item.name,
            pastSize,
            currentSize: item.size,
            delta
          });
        }
      }
    }

    return growth.sort((a, b) => b.delta - a.delta).slice(0, 50);
  }, [comparisonItems, allItems]);

  const exportHistoryCsv = () => {
    if (history.length === 0) return;
    const headers = ['ID', 'Scan Target', 'Timestamp', 'Duration (ms)', 'Files', 'Folders', 'Total Size (Bytes)'];
    const rows = history.map(h => 
      `"${h.id}"` + ',' +
      `"${h.path.replace(/"/g, '""')}"` + ',' +
      `"${new Date(h.timestamp).toISOString()}"` + ',' +
      h.durationMs + ',' +
      h.totalFiles + ',' +
      h.totalFolders + ',' +
      h.totalSize
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `disklens_scan_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/10 dark:bg-slate-900/30 rounded-2xl border border-slate-500/10 p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center space-x-2 text-slate-800 dark:text-slate-100">
            <History className="h-5.5 w-5.5 text-teal-500" />
            <span>History & Trend Tracking</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Analyze scan snapshots over time and view folder growth rates.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportHistoryCsv}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition-all"
            title="Export History to CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export History CSV</span>
          </button>
          <button
            onClick={refreshHistory}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-655 dark:text-slate-400 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Loading history data...
        </div>
      ) : history.length < 2 ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Run at least two scans to enable historic timeline comparison!
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-6 min-h-0 overflow-y-auto pr-1">
          
          <div className="glass-panel rounded-2xl p-5 border border-slate-500/10">
            <span className="text-xs font-bold text-slate-400 uppercase">Disk Usage Timeline (GB)</span>
            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} unit=" GB" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    labelStyle={{ fontWeight: 'bold', color: '#f8fafc' }}
                  />
                  <Line type="monotone" dataKey="sizeGB" stroke="#0d9488" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Growth since last scan</h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Compare with:</span>
                <select
                  value={comparisonTargetId}
                  onChange={(e) => setComparisonTargetId(e.target.value)}
                  className="text-xs bg-slate-100 dark:bg-slate-900 border border-slate-350 dark:border-slate-800 text-slate-705 dark:text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none"
                >
                  <option value="">Select snapshot...</option>
                  {history
                    .filter(h => h.id !== scanHeader?.id)
                    .map(h => (
                      <option key={h.id} value={h.id}>
                        {new Date(h.timestamp).toLocaleString()} ({h.path})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex-1 border border-slate-500/10 rounded-2xl overflow-hidden overflow-y-auto pr-1">
              {!comparisonItems ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Select a past scan snapshot to view directory growth.
                </div>
              ) : growthList.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No significant directory growth (&gt;5MB) detected.
                </div>
              ) : (
                <div className="divide-y divide-slate-500/10">
                  {growthList.map((folder) => (
                    <div key={folder.path} className="flex items-center justify-between p-3.5 text-xs hover:bg-slate-500/5 transition-colors">
                      <div className="flex items-center space-x-3 min-w-0 flex-1 mr-4">
                        <Folder className="h-4 w-4 text-yellow-500/80 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold truncate text-slate-800 dark:text-slate-200">
                            {folder.name}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate max-w-full font-mono mt-0.5">
                            {folder.path}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 flex-shrink-0">
                        <div className="text-right">
                          <span className="font-bold text-red-400 block text-xs">
                            +{formatSize(folder.delta)}
                          </span>
                          <span className="text-[9px] text-slate-500 block mt-0.5">
                            Was {formatSize(folder.pastSize)} → Now {formatSize(folder.currentSize)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

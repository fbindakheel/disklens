import React, { useState, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Folder, File, ChevronDown, ChevronRight, MoreVertical, Trash2, Eye, ExternalLink, Copy } from 'lucide-react';
import { useDiskStore } from '../../store/diskStore';

interface TableItem {
  path: string;
  name: string;
  size: number;
  modifiedTime: number;
  isDir: boolean;
  type: string;
  depth: number;
}

interface TableViewProps {
  onRefreshAfterDelete: (deletedPaths: string[]) => void;
}

export default function TableView({ onRefreshAfterDelete }: TableViewProps) {
  const { allItems, scanHeader } = useDiskStore();
  const rootPath = scanHeader?.path || '';

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ [rootPath]: true });
  const [sortField, setSortField] = useState<'name' | 'size' | 'type' | 'modifiedTime'>('size');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaths, setSelectedPaths] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: TableItem } | null>(null);
  const [listHeight, setListHeight] = useState(480);

  React.useEffect(() => {
    const handleResize = () => {
      setListHeight(Math.max(window.innerHeight - 340, 300));
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxItemSize = useMemo(() => {
    return Math.max(...allItems.map((i) => i.size), 1);
  }, [allItems]);

  const pathSeparator = rootPath.includes('\\') ? '\\' : '/';

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (ms: number) => {
    return new Date(ms).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const visibleItems = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return allItems.filter(item => item.name.toLowerCase().includes(q) || item.path.toLowerCase().includes(q));
    }

    const result: TableItem[] = [];

    for (const item of allItems) {
      if (item.path === rootPath) {
        result.push(item);
        continue;
      }

      const pathParts = item.path.substring(rootPath.length).split(/[/\\]/).filter(Boolean);
      let isVisible = true;
      let checkPath = rootPath;

      for (let i = 0; i < pathParts.length - 1; i++) {
        checkPath += (checkPath.endsWith(pathSeparator) ? '' : pathSeparator) + pathParts[i];
        if (!expandedFolders[checkPath]) {
          isVisible = false;
          break;
        }
      }

      if (isVisible) {
        result.push(item);
      }
    }

    return result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  }, [allItems, expandedFolders, sortField, sortOrder, searchQuery, rootPath, pathSeparator]);

  const handleSort = (field: 'name' | 'size' | 'type' | 'modifiedTime') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleSelect = (path: string) => {
    setSelectedPaths(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const selectAll = () => {
    const allSelected = visibleItems.every(item => selectedPaths[item.path]);
    const next: Record<string, boolean> = {};
    if (!allSelected) {
      visibleItems.forEach(item => {
        next[item.path] = true;
      });
    }
    setSelectedPaths(next);
  };

  const handleBulkDelete = async () => {
    const targets = Object.keys(selectedPaths).filter(p => selectedPaths[p]);
    if (targets.length === 0) return;

    const confirm = window.confirm(`Move selected ${targets.length} items to Trash?`);
    if (!confirm) return;

    const results = await window.electronAPI.deletePaths(targets);
    const successfullyDeleted = results.filter((r: any) => r.success).map((r: any) => r.path);

    if (successfullyDeleted.length > 0) {
      onRefreshAfterDelete(successfullyDeleted);
      setSelectedPaths({});
    }
  };

  const handleSingleDelete = async (item: TableItem) => {
    const confirm = window.confirm(`Move "${item.name}" to Trash?`);
    if (!confirm) return;

    const results = await window.electronAPI.deletePaths([item.path]);
    if (results[0].success) {
      onRefreshAfterDelete([item.path]);
    }
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = visibleItems[index];
    const isSelected = selectedPaths[item.path] || false;
    const isFolderExpanded = expandedFolders[item.path] || false;
    const sizePercent = (item.size / maxItemSize) * 100;

    return (
      <div
        style={style}
        className={`flex items-center px-4 border-b border-slate-500/10 hover:bg-slate-500/5 transition-colors group text-sm select-none ${isSelected ? 'bg-teal-500/10 border-teal-500/20' : ''}`}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            item
          });
        }}
      >
        <div className="w-8 flex justify-start items-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelect(item.path)}
            className="rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-550 w-4 h-4 cursor-pointer"
          />
        </div>

        <div className="flex-1 flex items-center min-w-0 pr-4" style={{ paddingLeft: `${item.depth * 16}px` }}>
          {item.isDir ? (
            <button
              onClick={() => toggleFolder(item.path)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded mr-1"
            >
              {isFolderExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
            </button>
          ) : (
            <div className="w-5.5 h-5.5 mr-1" />
          )}

          {item.isDir ? (
            <Folder className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
          ) : (
            <File className="h-4 w-4 text-blue-400 mr-2 flex-shrink-0" />
          )}

          <span 
            className="truncate font-medium text-slate-700 dark:text-slate-205 cursor-pointer hover:text-teal-500"
            onClick={() => item.isDir ? toggleFolder(item.path) : window.electronAPI.openFile(item.path)}
          >
            {item.name}
          </span>
        </div>

        <div className="w-48 flex items-center pr-4">
          <div className="w-16 text-right pr-3 font-semibold text-slate-650 dark:text-slate-300 font-mono text-xs">
            {formatSize(item.size)}
          </div>
          <div className="flex-1 bg-slate-205 dark:bg-slate-800 h-2 rounded-full overflow-hidden relative">
            <div 
              className="bg-teal-500 h-full rounded-full"
              style={{ width: `${Math.max(sizePercent, 1)}%` }}
            />
          </div>
        </div>

        <div className="w-24 text-slate-500 dark:text-slate-400 capitalize truncate pr-4 text-xs font-semibold">
          {item.type}
        </div>

        <div className="w-44 text-slate-500 dark:text-slate-400 text-xs">
          {formatDate(item.modifiedTime)}
        </div>

        <div className="w-8 flex justify-end">
          <button 
            onClick={(e) => {
              setContextMenu({
                x: e.clientX - 100,
                y: e.clientY + 10,
                item
              });
            }}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/10 dark:bg-slate-900/30 rounded-2xl border border-slate-500/10 p-4 overflow-hidden relative">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Search files/folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-none focus:border-teal-500 dark:text-slate-100 min-w-[240px]"
          />
          {Object.values(selectedPaths).filter(Boolean).length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold bg-red-500/20 hover:bg-red-500/35 border border-red-500/30 text-red-400 rounded-xl transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Selected ({Object.values(selectedPaths).filter(Boolean).length})</span>
            </button>
          )}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Showing {visibleItems.length.toLocaleString()} / {allItems.length.toLocaleString()} items
        </div>
      </div>

      <div className="flex items-center px-4 py-2.5 bg-slate-100 dark:bg-slate-900/40 rounded-xl border border-slate-500/10 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase select-none mb-2">
        <div className="w-8">
          <input
            type="checkbox"
            checked={visibleItems.length > 0 && visibleItems.every(item => selectedPaths[item.path])}
            onChange={selectAll}
            className="rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-550 w-4 h-4 cursor-pointer"
          />
        </div>
        <div 
          className="flex-1 flex items-center cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
          onClick={() => handleSort('name')}
        >
          Name {sortField === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
        </div>
        <div 
          className="w-48 flex items-center justify-start cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 pr-4"
          onClick={() => handleSort('size')}
        >
          Size {sortField === 'size' && (sortOrder === 'asc' ? '▲' : '▼')}
        </div>
        <div 
          className="w-24 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 pr-4"
          onClick={() => handleSort('type')}
        >
          Type {sortField === 'type' && (sortOrder === 'asc' ? '▲' : '▼')}
        </div>
        <div 
          className="w-44 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
          onClick={() => handleSort('modifiedTime')}
        >
          Last Modified {sortField === 'modifiedTime' && (sortOrder === 'asc' ? '▲' : '▼')}
        </div>
        <div className="w-8"></div>
      </div>

      <div className="flex-1 min-h-0 w-full">
        {visibleItems.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            No items found
          </div>
        ) : (
          <List
            height={listHeight}
            itemCount={visibleItems.length}
            itemSize={42}
            width="100%"
            style={{ overflowX: 'hidden' }}
          >
            {Row}
          </List>
        )}
      </div>

      {contextMenu && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-slate-900 border border-slate-800 rounded-xl py-1.5 shadow-2xl min-w-[170px]"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`
            }}
          >
            <button
              onClick={() => {
                window.electronAPI.openFile(contextMenu.item.path);
                setContextMenu(null);
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 text-left"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Open</span>
            </button>
            <button
              onClick={() => {
                window.electronAPI.showItemInFolder(contextMenu.item.path);
                setContextMenu(null);
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 text-left"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Show in Explorer</span>
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(contextMenu.item.path);
                setContextMenu(null);
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 text-left"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Path</span>
            </button>
            <div className="border-t border-slate-805 my-1" />
            <button
              onClick={() => {
                handleSingleDelete(contextMenu.item);
                setContextMenu(null);
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 text-left font-semibold"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Move to Trash</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

import React from 'react';
import { Compass, ShieldAlert, Sparkles, Calendar, History, Sun, Moon } from 'lucide-react';
import { useDiskStore, ActiveTab } from '../../store/diskStore';

export default function Sidebar() {
  const { activeTab, setActiveTab, darkMode, setDarkMode } = useDiskStore();

  const navItems = [
    { id: 'overview', name: 'Disk Overview', icon: Compass },
    { id: 'duplicates', name: 'Duplicates Finder', icon: ShieldAlert },
    { id: 'cleanup', name: 'Smart Cleanup', icon: Sparkles },
    { id: 'heatmap', name: 'Age Heatmap', icon: Calendar },
    { id: 'history', name: 'History & Trends', icon: History }
  ];

  return (
    <div className="w-64 glass-panel border-r border-slate-500/10 flex flex-col justify-between p-4 flex-shrink-0">
      <div>
        <div className="flex items-center space-x-3 mb-8 px-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-white font-black shadow-lg">
            DL
          </div>
          <span className="text-lg font-black tracking-wider text-slate-800 dark:text-white">DiskLens</span>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive 
                    ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 dark:text-slate-400'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-500/10 flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Dark Mode</span>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all"
        >
          {darkMode ? <Sun className="h-4.5 w-4.5 text-yellow-400" /> : <Moon className="h-4.5 w-4.5 text-slate-700" />}
        </button>
      </div>
    </div>
  );
}

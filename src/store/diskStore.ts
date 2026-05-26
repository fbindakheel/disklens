import { create } from 'zustand';

export type ActiveTab = 'overview' | 'duplicates' | 'cleanup' | 'heatmap' | 'history';

interface DiskState {
  activeTab: ActiveTab;
  darkMode: boolean;
  scanPath: string;
  isScanning: boolean;
  scanProgress: {
    filesScanned: number;
    foldersScanned: number;
    bytesScanned: number;
    currentFolder: string;
  } | null;
  scanTime: number;
  scanHeader: any | null;
  allItems: any[];
  duplicates: Record<string, string[]>;
  scanError: string | null;
  whitelist: string[];

  setActiveTab: (tab: ActiveTab) => void;
  setDarkMode: (dark: boolean) => void;
  setScanPath: (path: string) => void;
  setIsScanning: (scanning: boolean) => void;
  setScanProgress: (progress: any) => void;
  setScanTime: (time: number) => void;
  setScanHeader: (header: any) => void;
  setAllItems: (items: any[]) => void;
  setDuplicates: (dupes: Record<string, string[]>) => void;
  setScanError: (error: string | null) => void;
  addToWhitelist: (path: string) => void;
  removeFromWhitelist: (path: string) => void;
}

export const useDiskStore = create<DiskState>((set) => ({
  activeTab: 'overview',
  darkMode: true,
  scanPath: process.platform === 'win32' ? 'C:\\' : '/',
  isScanning: false,
  scanProgress: null,
  scanTime: 0,
  scanHeader: null,
  allItems: [],
  duplicates: {},
  scanError: null,
  whitelist: [],

  setActiveTab: (tab) => set({ activeTab: tab }),
  setDarkMode: (dark) => set({ darkMode: dark }),
  setScanPath: (path) => set({ scanPath: path }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setScanProgress: (progress) => set({ scanProgress: progress }),
  setScanTime: (time) => set({ scanTime: time }),
  setScanHeader: (header) => set({ scanHeader: header }),
  setAllItems: (items) => set({ allItems: items }),
  setDuplicates: (dupes) => set({ duplicates: dupes }),
  setScanError: (error) => set({ scanError: error }),
  addToWhitelist: (path) => set((state) => ({ whitelist: [...state.whitelist, path] })),
  removeFromWhitelist: (path) => set((state) => ({ whitelist: state.whitelist.filter(p => p !== path) }))
}));

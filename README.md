# 🔍 DiskLens — Next-Gen Cross-Platform Disk Space Analyzer

[![License](https://img.shields.io/badge/License-MIT-teal.svg)](#)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-teal.svg)](#)
[![Version](https://img.shields.io/badge/Version-v1.0.0-teal.svg)](#)

DiskLens is a blazing-fast, cross-platform desktop storage space visualizer and cleanup analyzer built to fill the gap WizTree leaves on macOS and Linux.

---

## Why Mac Users Should Care
WizTree is widely known as the fastest disk space analyzer in the world, but it is **Windows-only** because of its native dependence on Windows NTFS Master File Table (MFT) indexing. macOS users have had to settle for slower directory traversers. **DiskLens solves this.** By utilizing high-concurrency Node.js multi-threaded workers, DiskLens crawls Apple Silicon (M-series) drives at speeds matching WizTree, bringing real-time visual treemaps, duplicate hash matches, and cache sweep suggestions to Mac users for the first time.

---

## Feature Comparison

| Feature | 🔍 DiskLens | ⚡ WizTree | 🌸 DaisyDisk | 🌳 TreeSize |
|---|---|---|---|---|
| **Cross-Platform** | **Yes** (Mac, Win, Linux) | No (Windows only) | No (Mac only) | No (Windows only) |
| **D3 Visual Charts** | **Yes** (Treemap, Sunburst) | Yes (Treemap only) | Yes (Sunburst only) | No |
| **Duplicates Detector**| **Yes** (Verified MD5/SHA) | No | No | No |
| **Smart Cleanup Suggestions**| **Yes** (Xcode, node_modules, simulators)| No | No | No |
| **History & Timeline Trends**| **Yes** (Recharts graph + delta diff)| No | No | No |
| **Safe Deletions** | **Yes** (Moves to Trash/Recycle bin)| Yes | Yes | Yes |

---

## Installation & Running

Ensure you have [Node.js](https://nodejs.org) installed.

### Step 1: Install Dependencies
```bash
npm install --legacy-peer-deps
```

### Step 2: Run in Development Mode
```bash
npm run electron:dev
```

### Step 3: Build & Package
To compile frontend code and package executable installers for the native platform:
```bash
npm run electron:build
```
Outputs will be built in the `dist_electron/` directory.

---

## Technology Stack
- **Shell Framework**: Electron 30
- **Frontend Framework**: React 18 & TypeScript
- **State Management**: Zustand
- **Visualization**: D3.js (Treemap, Sunburst, Bar charts), Recharts (Timeline growth trends)
- **Styling**: Tailwind CSS
- **Parallel Scanning**: Node.js `worker_threads`

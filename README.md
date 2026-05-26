# 🔍 DiskLens — Next-Gen Windows Disk Space Analyzer

[![License](https://img.shields.io/badge/License-MIT-teal.svg)](#)
[![Platform](https://img.shields.io/badge/Platform-Windows-teal.svg)](#)
[![Version](https://img.shields.io/badge/Version-v1.0.0-teal.svg)](#)

DiskLens is a blazing-fast Windows desktop storage space visualizer, NTFS-optimized analyzer, and cleanup assistant built to bring modern interactive visualizations and smart utilities directly to Windows users.

---

## Why DiskLens?
While tools like WizTree and TreeSize exist on Windows, DiskLens is built to provide a premium, modern experience. Utilizing high-concurrency Node.js multi-threaded workers, DiskLens crawls your drives at lightning speeds, offering real-time interactive D3 treemaps, historical snapshot trends, automatic duplicate file detection, and smart cache cleanup sweep recommendations.

---

## Feature Comparison

| Feature | 🔍 DiskLens | ⚡ WizTree | 🌳 TreeSize |
|---|---|---|---|
| **Platform** | **Windows** | Windows | Windows |
| **D3 Visual Charts** | **Yes** (Treemap, Sunburst) | Yes (Treemap only) | No |
| **Duplicates Detector**| **Yes** (Verified MD5/SHA) | No | No |
| **Smart Cleanup Suggestions**| **Yes** (downloads, temp files, node_modules)| No | No |
| **History & Timeline Trends**| **Yes** (Recharts graph + delta diff)| No | No |
| **Safe Deletions** | **Yes** (Moves to Recycle Bin)| Yes | Yes |

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
To compile frontend code and package executable installers for Windows:
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

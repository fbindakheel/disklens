export interface JunkCategory {
  id: string;
  name: string;
  description: string;
  savings: string;
  paths: string[];
}

export function detectJunk(allItems: any[]): JunkCategory[] {
  const nodeModules: string[] = [];
  const xcodeCaches: string[] = [];
  const iosSimulators: string[] = [];
  const dockerCaches: string[] = [];
  const downloads: string[] = [];
  const logFiles: string[] = [];
  const dsStores: string[] = [];
  const trashItems: string[] = [];
  const browserCaches: string[] = [];
  const pkgCaches: string[] = [];

  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

  const seenNodeModules = new Set<string>();
  const seenXcode = new Set<string>();
  const seenSims = new Set<string>();
  const seenDocker = new Set<string>();
  const seenBrowser = new Set<string>();
  const seenPkg = new Set<string>();

  for (const item of allItems) {
    const lowerPath = item.path.toLowerCase();

    // 1. node_modules
    if (lowerPath.includes('node_modules')) {
      const parts = item.path.split(/[/\\]/);
      const nmIdx = parts.findIndex(p => p.toLowerCase() === 'node_modules');
      if (nmIdx !== -1) {
        const nmPath = parts.slice(0, nmIdx + 1).join(item.path.includes('\\') ? '\\' : '/');
        if (!seenNodeModules.has(nmPath)) {
          nodeModules.push(nmPath);
          seenNodeModules.add(nmPath);
        }
      }
      continue;
    }

    // 2. Xcode Caches
    if (lowerPath.includes('library/developer/xcode')) {
      const parts = item.path.split(/[/\\]/);
      const xcodeIdx = parts.findIndex(p => p.toLowerCase() === 'xcode');
      if (xcodeIdx !== -1) {
        const xPath = parts.slice(0, xcodeIdx + 1).join(item.path.includes('\\') ? '\\' : '/');
        if (!seenXcode.has(xPath)) {
          xcodeCaches.push(xPath);
          seenXcode.add(xPath);
        }
      }
      continue;
    }

    // 3. iOS Simulators
    if (lowerPath.includes('library/developer/coresimulator')) {
      const parts = item.path.split(/[/\\]/);
      const simIdx = parts.findIndex(p => p.toLowerCase() === 'coresimulator');
      if (simIdx !== -1) {
        const sPath = parts.slice(0, simIdx + 1).join(item.path.includes('\\') ? '\\' : '/');
        if (!seenSims.has(sPath)) {
          iosSimulators.push(sPath);
          seenSims.add(sPath);
        }
      }
      continue;
    }

    // 4. Docker caches/volumes
    if (lowerPath.includes('.docker') || lowerPath.includes('/docker/')) {
      const parts = item.path.split(/[/\\]/);
      const dockerIdx = parts.findIndex(p => p.toLowerCase() === '.docker' || p.toLowerCase() === 'docker');
      if (dockerIdx !== -1) {
        const dPath = parts.slice(0, dockerIdx + 1).join(item.path.includes('\\') ? '\\' : '/');
        if (!seenDocker.has(dPath)) {
          dockerCaches.push(dPath);
          seenDocker.add(dPath);
        }
      }
      continue;
    }

    // 5. Old Downloads
    if (lowerPath.includes('/downloads/') || lowerPath.includes('\\downloads\\')) {
      if (!item.isDir && item.modifiedTime < ninetyDaysAgo) {
        downloads.push(item.path);
      }
      continue;
    }

    // 6. Log Files > 50MB
    if (!item.isDir && item.name.endsWith('.log') && item.size > 50 * 1024 * 1024) {
      logFiles.push(item.path);
      continue;
    }

    // 7. .DS_Store
    if (!item.isDir && item.name.toLowerCase() === '.ds_store') {
      dsStores.push(item.path);
      continue;
    }

    // 8. Trash
    if (lowerPath.includes('$recycle.bin') || lowerPath.includes('/.trash') || lowerPath.includes('\\.trash') || lowerPath.includes('trash/files')) {
      trashItems.push(item.path);
      continue;
    }

    // 9. Browser caches (Chrome, Firefox, Safari)
    if (
      lowerPath.includes('library/caches/com.google.chrome') || 
      lowerPath.includes('appdata/local/google/chrome') || 
      lowerPath.includes('mozilla/firefox/profiles')
    ) {
      const parts = item.path.split(/[/\\]/);
      const cacheIdx = parts.findIndex(p => p.toLowerCase() === 'caches' || p.toLowerCase() === 'chrome' || p.toLowerCase() === 'profiles');
      if (cacheIdx !== -1) {
        const cPath = parts.slice(0, cacheIdx + 1).join(item.path.includes('\\') ? '\\' : '/');
        if (!seenBrowser.has(cPath)) {
          browserCaches.push(cPath);
          seenBrowser.add(cPath);
        }
      }
      continue;
    }

    // 10. pip/npm/yarn cache
    if (lowerPath.includes('.npm') || lowerPath.includes('.yarn') || lowerPath.includes('pip/cache') || lowerPath.includes('pip\\cache')) {
      const parts = item.path.split(/[/\\]/);
      const pkgIdx = parts.findIndex(p => p.toLowerCase() === '.npm' || p.toLowerCase() === '.yarn' || p.toLowerCase() === 'pip');
      if (pkgIdx !== -1) {
        const pPath = parts.slice(0, pkgIdx + 1).join(item.path.includes('\\') ? '\\' : '/');
        if (!seenPkg.has(pPath)) {
          pkgCaches.push(pPath);
          seenPkg.add(pPath);
        }
      }
      continue;
    }
  }

  return [
    { id: 'node_modules', name: 'Node Modules Folders', description: 'Heavy packages from older JS projects', savings: '1–20 GB', paths: nodeModules },
    { id: 'xcode', name: 'Xcode developer caches', description: 'Leftover derivatives, indexes & archives', savings: '5–30 GB', paths: xcodeCaches },
    { id: 'simulators', name: 'iOS simulator profiles', description: 'Forgotten virtual disk space clones', savings: '10–50 GB', paths: iosSimulators },
    { id: 'docker', name: 'Docker images / layers', description: 'Old dangling images & unused docker volumes', savings: '2–20 GB', paths: dockerCaches },
    { id: 'downloads', name: 'Old Downloads', description: 'Files in Downloads older than 90 days', savings: 'Variable', paths: downloads },
    { id: 'logs', name: 'Bloated Log files', description: 'Plain text runtime log files larger than 50MB', savings: 'Variable', paths: logFiles },
    { id: 'ds_store', name: '.DS_Store layout files', description: 'macOS folder display caches', savings: 'Small', paths: dsStores },
    { id: 'trash', name: 'Trash & Recycle Bin', description: 'Trash folders holding deleted structures', savings: 'Variable', paths: trashItems },
    { id: 'browsers', name: 'Browser Cache caches', description: 'Chrome/Firefox local webpage structures', savings: '0.5–5 GB', paths: browserCaches },
    { id: 'package_caches', name: 'Package manager caches', description: 'Cached items from npm, pip, and yarn', savings: '1–10 GB', paths: pkgCaches }
  ].filter(c => c.paths.length > 0);
}

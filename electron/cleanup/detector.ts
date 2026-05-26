export interface JunkCategory {
  id: string;
  name: string;
  description: string;
  savings: string;
  paths: string[];
}

export function detectJunk(allItems: any[]): JunkCategory[] {
  const nodeModules: string[] = [];
  const dockerCaches: string[] = [];
  const downloads: string[] = [];
  const logFiles: string[] = [];
  const trashItems: string[] = [];
  const browserCaches: string[] = [];
  const pkgCaches: string[] = [];

  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

  const seenNodeModules = new Set<string>();
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

    // 2. Docker caches/volumes
    if (lowerPath.includes('.docker') || lowerPath.includes('/docker/') || lowerPath.includes('\\docker\\')) {
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

    // 3. Old Downloads
    if (lowerPath.includes('\\downloads\\') || lowerPath.includes('/downloads/')) {
      if (!item.isDir && item.modifiedTime < ninetyDaysAgo) {
        downloads.push(item.path);
      }
      continue;
    }

    // 4. Log Files > 50MB
    if (!item.isDir && item.name.endsWith('.log') && item.size > 50 * 1024 * 1024) {
      logFiles.push(item.path);
      continue;
    }

    // 5. Recycle Bin (Trash)
    if (lowerPath.includes('$recycle.bin')) {
      trashItems.push(item.path);
      continue;
    }

    // 6. Browser caches (Chrome, Firefox)
    if (
      lowerPath.includes('appdata/local/google/chrome') || 
      lowerPath.includes('mozilla/firefox/profiles')
    ) {
      const parts = item.path.split(/[/\\]/);
      const cacheIdx = parts.findIndex(p => p.toLowerCase() === 'chrome' || p.toLowerCase() === 'profiles');
      if (cacheIdx !== -1) {
        const cPath = parts.slice(0, cacheIdx + 1).join(item.path.includes('\\') ? '\\' : '/');
        if (!seenBrowser.has(cPath)) {
          browserCaches.push(cPath);
          seenBrowser.add(cPath);
        }
      }
      continue;
    }

    // 7. pip/npm/yarn cache
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
    { id: 'docker', name: 'Docker images / layers', description: 'Old dangling images & unused docker volumes', savings: '2–20 GB', paths: dockerCaches },
    { id: 'downloads', name: 'Old Downloads', description: 'Files in Downloads older than 90 days', savings: 'Variable', paths: downloads },
    { id: 'logs', name: 'Bloated Log files', description: 'Plain text runtime log files larger than 50MB', savings: 'Variable', paths: logFiles },
    { id: 'trash', name: 'Recycle Bin', description: 'Windows Recycle Bin holding deleted files', savings: 'Variable', paths: trashItems },
    { id: 'browsers', name: 'Browser Cache', description: 'Chrome/Firefox local webpage structures', savings: '0.5–5 GB', paths: browserCaches },
    { id: 'package_caches', name: 'Package manager caches', description: 'Cached items from npm, pip, and yarn', savings: '1–10 GB', paths: pkgCaches }
  ].filter(c => c.paths.length > 0);
}

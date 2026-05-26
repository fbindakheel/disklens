export interface TreeMapNode {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  type: string;
  children?: TreeMapNode[];
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export function computeTreemap(
  node: TreeMapNode,
  x: number,
  y: number,
  w: number,
  h: number
): TreeMapNode {
  if (!node.children || node.children.length === 0) {
    return { ...node, x, y, w, h };
  }

  const children = [...node.children].sort((a, b) => b.size - a.size);
  const total = children.reduce((sum, c) => sum + c.size, 0);

  if (total === 0) {
    const count = children.length;
    const isWider = w > h;
    const mapped: TreeMapNode[] = [];
    
    for (let i = 0; i < count; i++) {
      const cx = isWider ? x + (i * w) / count : x;
      const cy = isWider ? y : y + (i * h) / count;
      const cw = isWider ? w / count : w;
      const ch = isWider ? h / count : h;
      mapped.push(computeTreemap(children[i], cx, cy, cw, ch));
    }
    return { ...node, x, y, w, h, children: mapped };
  }

  const isWider = w > h;
  let offset = 0;
  const mapped: TreeMapNode[] = [];

  for (const child of children) {
    const ratio = child.size / total;
    const cx = isWider ? x + offset : x;
    const cy = isWider ? y : y + offset;
    const cw = isWider ? w * ratio : w;
    const ch = isWider ? h : h * ratio;

    mapped.push(computeTreemap(child, cx, cy, cw, ch));
    offset += isWider ? cw : ch;
  }

  return { ...node, x, y, w, h, children: mapped };
}

export function buildTree(files: any[], rootPath: string): TreeMapNode {
  const rootName = rootPath.split(/[/\\]/).pop() || rootPath;
  const root: TreeMapNode = {
    name: rootName,
    path: rootPath,
    size: 0,
    isDir: true,
    type: 'folder',
    children: []
  };

  const map = new Map<string, TreeMapNode>();
  map.set(rootPath, root);

  const sortedFiles = [...files].sort((a, b) => a.depth - b.depth);

  for (const file of sortedFiles) {
    if (file.path === rootPath) continue;

    const parentPath = file.path.substring(0, file.path.lastIndexOf(pathSeparator(file.path)));
    let parent = map.get(parentPath);
    
    if (!parent) {
      parent = root;
    }

    const node: TreeMapNode = {
      name: file.name,
      path: file.path,
      size: file.size,
      isDir: file.isDir,
      type: file.type,
      children: file.isDir ? [] : undefined
    };

    map.set(file.path, node);
    if (!parent.children) parent.children = [];
    parent.children.push(node);
  }

  calculateFolderSizes(root);
  return root;
}

function calculateFolderSizes(node: TreeMapNode): number {
  if (!node.isDir || !node.children) return node.size;
  let total = 0;
  for (const child of node.children) {
    total += calculateFolderSizes(child);
  }
  node.size = total;
  return total;
}

function pathSeparator(filePath: string): string {
  return filePath.includes('/') ? '/' : '\\';
}

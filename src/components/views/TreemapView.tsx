import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { ArrowLeft, ChevronRight, Eye, RefreshCw, BarChart2, PieChart, LayoutGrid } from 'lucide-react';
import { useDiskStore } from '../../store/diskStore';
import { buildTree, TreeMapNode } from '../../utils/treemap';

interface TreemapViewProps {
  rootNode: TreeMapNode;
}

type ChartType = 'treemap' | 'sunburst' | 'bar';

const colorMap: Record<string, string> = {
  document: '#3b82f6', // blue
  media: '#f97316',    // orange
  code: '#22c55e',     // green
  system: '#ef4444',   // red
  archive: '#a855f7',  // purple
  other: '#64748b',    // gray
  folder: 'transparent'
};

export default function TreemapView({ rootNode }: TreemapViewProps) {
  const [currentPath, setCurrentPath] = useState(rootNode.path);
  const [chartType, setChartType] = useState<ChartType>('treemap');
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Active subtree node based on navigation path
  const activeNode = useMemo(() => {
    if (currentPath === rootNode.path) return rootNode;
    const findNode = (n: TreeMapNode): TreeMapNode | null => {
      if (n.path === currentPath) return n;
      if (n.children) {
        for (const child of n.children) {
          const found = findNode(child);
          if (found) return found;
        }
      }
      return null;
    };
    return findNode(rootNode) || rootNode;
  }, [rootNode, currentPath]);

  // Convert to D3 hierarchy format
  const hierarchyData = useMemo(() => {
    return d3.hierarchy(activeNode)
      .sum(d => d.isDir ? 0 : d.size)
      .sort((a, b) => (b.value || 0) - (a.value || 0));
  }, [activeNode]);

  // Format bytes
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Re-draw chart on container resize or change
  useEffect(() => {
    if (!svgRef.current || !hierarchyData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 800;
    const height = 500;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    if (chartType === 'treemap') {
      const treemap = d3.treemap<TreeMapNode>()
        .size([width, height])
        .padding(1)
        .round(true);

      const root = treemap(hierarchyData);

      const cell = svg.selectAll('g')
        .data(root.leaves())
        .enter()
        .append('g')
        .attr('transform', d => `translate(${d.x0},${d.y0})`);

      cell.append('rect')
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .attr('fill', d => colorMap[d.data.type] || colorMap.other)
        .attr('opacity', 0.8)
        .attr('class', 'cursor-pointer hover:opacity-100 transition-opacity')
        .on('click', (event, d) => {
          if (d.data.isDir) {
            setCurrentPath(d.data.path);
          }
        });

      cell.append('text')
        .attr('x', 4)
        .attr('y', 14)
        .text(d => (d.x1 - d.x0 > 50 && d.y1 - d.y0 > 25) ? d.data.name : '')
        .attr('fill', '#ffffff')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('class', 'pointer-events-none select-none truncate');

    } else if (chartType === 'sunburst') {
      const radius = Math.min(width, height) / 2 - 20;

      const partition = d3.partition<TreeMapNode>()
        .size([2 * Math.PI, radius]);

      const root = partition(hierarchyData);

      const arc = d3.arc<d3.HierarchyRectangularNode<TreeMapNode>>()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => d.y0)
        .outerRadius(d => d.y1);

      const g = svg.append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

      g.selectAll('path')
        .data(root.descendants().filter(d => d.depth > 0))
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('fill', d => colorMap[d.data.type] || colorMap.other)
        .attr('stroke', '#1e293b')
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.85)
        .attr('class', 'cursor-pointer hover:opacity-100 transition-opacity')
        .on('click', (event, d) => {
          if (d.data.isDir) {
            setCurrentPath(d.data.path);
          }
        });

    } else if (chartType === 'bar') {
      // Bar Chart: Top 10 largest sub-items
      const topItems = hierarchyData.children?.slice(0, 10) || [];
      const margin = { top: 30, right: 30, bottom: 40, left: 150 };
      const barWidth = width - margin.left - margin.right;
      const barHeight = height - margin.top - margin.bottom;

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear()
        .domain([0, d3.max(topItems, d => d.value || 0) || 1])
        .range([0, barWidth]);

      const y = d3.scaleBand()
        .domain(topItems.map(d => d.data.name))
        .range([0, barHeight])
        .padding(0.15);

      g.append('g')
        .attr('transform', `translate(0,${barHeight})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d => formatSize(Number(d))));

      g.append('g')
        .call(d3.axisLeft(y));

      g.selectAll('rect')
        .data(topItems)
        .enter()
        .append('rect')
        .attr('x', 0)
        .attr('y', d => y(d.data.name) || 0)
        .attr('width', d => x(d.value || 0))
        .attr('height', y.bandwidth())
        .attr('fill', '#4f98a3')
        .attr('class', 'cursor-pointer hover:opacity-90 transition-opacity')
        .on('click', (event, d) => {
          if (d.data.isDir) {
            setCurrentPath(d.data.path);
          }
        });
    }
  }, [hierarchyData, chartType, currentPath]);

  // Breadcrumbs path
  const breadcrumbs = useMemo(() => {
    const parts = currentPath.split(/[/\\]/).filter(Boolean);
    const crumbs = [];
    let currentAccumulator = '';
    const isWindows = rootNode.path.includes('\\');
    const separator = isWindows ? '\\' : '/';
    
    if (rootNode.path.startsWith('/') || !isWindows) {
      crumbs.push({ name: 'Root', path: rootNode.path });
    }

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (isWindows && i === 0 && part.endsWith(':')) {
        currentAccumulator = part + '\\';
      } else {
        currentAccumulator += (currentAccumulator.endsWith('\\') || currentAccumulator.endsWith('/') || !currentAccumulator ? '' : separator) + part;
      }
      
      if (currentAccumulator.length >= rootNode.path.length) {
        crumbs.push({ name: part, path: currentAccumulator });
      }
    }
    return crumbs.length > 0 ? crumbs : [{ name: activeNode.name, path: activeNode.path }];
  }, [currentPath, rootNode, activeNode]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/10 dark:bg-slate-900/30 rounded-2xl border border-slate-500/10 p-4 overflow-hidden">
      
      {/* Navigation breadcrumbs and chart picker */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="flex items-center space-x-2 text-xs">
          {currentPath !== rootNode.path && (
            <button
              onClick={() => {
                const parentPath = currentPath.substring(0, currentPath.lastIndexOf(currentPath.includes('/') ? '/' : '\\'));
                setCurrentPath(parentPath.length >= rootNode.path.length ? parentPath : rootNode.path);
              }}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-350 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex items-center space-x-1 overflow-x-auto whitespace-nowrap">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.path}>
                {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-400 flex-shrink-0" />}
                <button
                  onClick={() => setCurrentPath(crumb.path)}
                  className={`hover:text-teal-500 transition-colors font-medium ${idx === breadcrumbs.length - 1 ? 'text-slate-800 dark:text-slate-200 font-bold' : ''}`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* View mode toggle tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-500/10">
          <button 
            onClick={() => setChartType('treemap')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${chartType === 'treemap' ? 'bg-teal-600 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setChartType('sunburst')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${chartType === 'sunburst' ? 'bg-teal-600 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            <PieChart className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${chartType === 'bar' ? 'bg-teal-600 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
            <BarChart2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 w-full bg-slate-950/20 dark:bg-slate-950/40 rounded-xl border border-slate-500/10 flex items-center justify-center p-2 min-h-0">
        <svg ref={svgRef} className="w-full h-full max-h-[460px]"></svg>
      </div>
    </div>
  );
}

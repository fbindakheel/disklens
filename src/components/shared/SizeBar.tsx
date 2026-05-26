import React from 'react';

interface SizeBarProps {
  percent: number;
  className?: string;
}

export default function SizeBar({ percent, className = 'bg-teal-500' }: SizeBarProps) {
  return (
    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden relative">
      <div 
        className={`${className} h-full rounded-full transition-all duration-200`}
        style={{ width: `${Math.max(Math.min(percent, 100), 0.5)}%` }}
      />
    </div>
  );
}

import React from 'react';
import { File, Folder, Image, Music, Code, ShieldAlert, Archive, FileText } from 'lucide-react';

interface FileIconProps {
  type: string;
  isDir: boolean;
  className?: string;
}

export default function FileIcon({ type, isDir, className = 'h-4 w-4' }: FileIconProps) {
  if (isDir) {
    return <Folder className={`${className} text-yellow-500 fill-yellow-500/10`} />;
  }

  switch (type) {
    case 'document':
      return <FileText className={`${className} text-blue-400`} />;
    case 'media':
      return <Image className={`${className} text-orange-400`} />;
    case 'code':
      return <Code className={`${className} text-green-400`} />;
    case 'archive':
      return <Archive className={`${className} text-purple-400`} />;
    case 'system':
      return <ShieldAlert className={`${className} text-red-400`} />;
    default:
      return <File className={`${className} text-slate-400`} />;
  }
}

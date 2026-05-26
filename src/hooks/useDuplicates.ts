import { useState, useEffect } from 'react';
import { useDiskStore } from '../store/diskStore';

export function useDuplicates() {
  const { allItems, setDuplicates } = useDiskStore();
  const [isHashing, setIsHashing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    const unsubHashProgress = window.electronAPI.onDuplicateProgress((event: any, p: { current: number; total: number }) => {
      setProgress(p);
    });
    return () => unsubHashProgress();
  }, []);

  const findDuplicates = async () => {
    if (allItems.length === 0) return;
    setIsHashing(true);
    setProgress(null);
    try {
      const dupes = await window.electronAPI.findDuplicateFiles(allItems);
      setDuplicates(dupes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsHashing(false);
      setProgress(null);
    }
  };

  return { findDuplicates, isHashing, progress };
}

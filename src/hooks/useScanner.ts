import { useEffect, useRef } from 'react';
import { useDiskStore } from '../store/diskStore';

export function useScanner() {
  const {
    scanPath,
    isScanning,
    setIsScanning,
    setScanProgress,
    setScanTime,
    setScanHeader,
    setAllItems,
    setDuplicates,
    setScanError
  } = useDiskStore();

  const timerRef = useRef<any>(null);

  useEffect(() => {
    const unsubProgress = window.electronAPI.onScanProgress((event: any, progress: any) => {
      setScanProgress(progress);
    });

    const unsubComplete = window.electronAPI.onScanComplete((event: any, payload: any) => {
      const { header, result } = payload;
      setIsScanning(false);
      setScanHeader(header);
      setAllItems(result.items);
      setDuplicates(result.duplicates);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    const unsubError = window.electronAPI.onScanError((event: any, errorMsg: string) => {
      setIsScanning(false);
      setScanError(errorMsg);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    });

    return () => {
      unsubProgress();
      unsubComplete();
      unsubError();
    };
  }, []);

  const startScan = () => {
    if (isScanning) return;

    setIsScanning(true);
    setScanProgress(null);
    setScanTime(0);
    setScanError(null);
    setScanHeader(null);
    setAllItems([]);
    setDuplicates({});

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setScanTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    window.electronAPI.scanDirectory(scanPath);
  };

  const stopScan = () => {
    window.electronAPI.stopScan();
    setIsScanning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return { startScan, stopScan };
}

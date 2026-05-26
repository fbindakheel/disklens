import { useState, useEffect } from 'react';

export function useHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getScanHistory();
      setHistory(data.sort((a: any, b: any) => a.timestamp - b.timestamp));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return { history, loading, refreshHistory: fetchHistory };
}

// React hook for offline sync status
import { useState, useEffect } from 'react';
import { offlineSyncService } from '../services/offlineSyncService';

export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Subscribe to pending count changes
    const unsubscribe = offlineSyncService.subscribe((count) => {
      setPendingCount(count);
    });

    // Monitor online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      offlineSyncService.syncPendingRequests().then(() => {
        setIsSyncing(false);
      });
      setIsSyncing(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSyncing(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check
    if (navigator.onLine) {
      offlineSyncService.syncPendingRequests().then(() => {
        setIsSyncing(false);
      });
      setIsSyncing(true);
    }

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncNow = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    await offlineSyncService.syncPendingRequests();
    setIsSyncing(false);
  };

  return {
    pendingCount,
    isOnline,
    isSyncing,
    syncNow,
  };
}


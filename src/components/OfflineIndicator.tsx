import React from 'react';
import { WifiOff } from 'lucide-react';
import { Badge } from './ui/badge';
import { useOfflineSync } from '../hooks/useOfflineSync';

export function OfflineIndicator() {
  const { isOnline, pendingCount } = useOfflineSync();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">Offline Mode</span>
      {pendingCount > 0 && (
        <Badge variant="secondary" className="ml-2">
          {pendingCount} pending
        </Badge>
      )}
    </div>
  );
}


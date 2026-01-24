// Sync Status Component - Shows offline sync status and pending requests
import React from 'react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';

export function SyncStatus() {
  const { pendingCount, isOnline, isSyncing, syncNow } = useOfflineSync();

  if (pendingCount === 0 && isOnline) {
    return null; // Don't show if everything is synced and online
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-background border shadow-lg p-3',
        !isOnline && 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      )}
    >
      {isOnline ? (
        <>
          {pendingCount > 0 ? (
            <>
              <Cloud className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {pendingCount} {pendingCount === 1 ? 'item' : 'items'} pending sync
              </span>
              <Badge variant="secondary" className="ml-2">
                {pendingCount}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={syncNow}
                disabled={isSyncing}
                className="ml-2"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Sync Now
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">All synced</span>
            </>
          )}
        </>
      ) : (
        <>
          <CloudOff className="h-4 w-4 text-yellow-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Offline - {pendingCount} {pendingCount === 1 ? 'item' : 'items'} queued
          </span>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {pendingCount}
            </Badge>
          )}
        </>
      )}
    </div>
  );
}


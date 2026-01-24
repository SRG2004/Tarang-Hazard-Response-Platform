// Notification Permission Component - Requests push notification permission
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Bell, BellOff, X } from 'lucide-react';
import { notificationService, NotificationService as NotifService } from '../services/notificationService';
import { toast } from 'sonner';

export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check current permission
    if (NotifService.isSupported()) {
      setPermission(Notification.permission);
      // Show banner if permission is not granted (only show once per session)
      if (Notification.permission === 'default' && !sessionStorage.getItem('notification-banner-shown')) {
        setShowBanner(true);
        sessionStorage.setItem('notification-banner-shown', 'true');
      }
    }

    // Listen for permission changes
    const checkPermission = () => {
      setPermission(Notification.permission);
      if (Notification.permission === 'granted') {
        setShowBanner(false);
      }
    };

    // Poll for permission changes (Notification API doesn't have an event)
    const interval = setInterval(checkPermission, 1000);

    return () => clearInterval(interval);
  }, []);

  const requestPermission = async () => {
    try {
      const granted = await notificationService.initialize();
      if (granted) {
        setPermission('granted');
        setShowBanner(false);
        toast.success('Notifications enabled! You will receive alerts for important updates.');
      } else {
        toast.error('Notification permission denied. You can enable it later in settings.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to enable notifications');
    }
  };

  if (!NotifService.isSupported() || !showBanner) {
    return null;
  }

  return (
    <Card className="fixed top-20 right-4 z-50 w-80 shadow-lg border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Enable Notifications</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBanner(false)}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-sm">
          Get instant alerts for hazard reports, emergency updates, and important announcements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={requestPermission}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          <Bell className="mr-2 h-4 w-4" />
          Enable Notifications
        </Button>
      </CardContent>
    </Card>
  );
}



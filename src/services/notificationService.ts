// Notification Service for Firebase Cloud Messaging (FCM) Push Notifications
import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { messaging } from '../lib/firebase';
import { auth } from '../lib/firebase';

// VAPID key - Replace with your actual VAPID key from Firebase Console
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string;
  requireInteraction?: boolean;
}

class NotificationService {
  private messagingInstance: Messaging | null = null;
  private fcmToken: string | null = null;
  private tokenRefreshInterval: NodeJS.Timeout | null = null;

  // Initialize FCM
  async initialize(): Promise<boolean> {
    // TEMPORARILY DISABLED: FCM backend not configured
    console.log('Push notifications disabled');
    return false;

    try {
      // Skip FCM entirely if VAPID key is missing or looks invalid
      if (!VAPID_KEY || VAPID_KEY.length < 50) {
        console.log('Push notifications disabled (VAPID key not configured)');
        return false;
      }

      if (!messaging) {
        console.warn('Firebase Messaging not available');
        return false;
      }

      this.messagingInstance = messaging;

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission not granted');
        return false;
      }

      // Get FCM token with error handling
      try {
        await this.getToken();
      } catch (tokenError: any) {
        // Silently fail on FCM 401 errors (backend not configured)
        if (tokenError?.code?.includes('messaging/token-subscribe-failed')) {
          console.log('Push notifications unavailable (backend config required)');
          return false;
        }
        throw tokenError;
      }

      // Set up foreground message handler
      this.setupForegroundHandler();

      // Set up token refresh
      this.setupTokenRefresh();

      console.log('Notification service initialized');
      return true;
    } catch (error) {
      console.log('Push notifications not available');
      return false;
    }
  }

  // Get FCM token
  async getToken(): Promise<string | null> {
    try {
      if (!this.messagingInstance) {
        return null;
      }

      // Skip FCM entirely if VAPID key is missing or invalid
      if (!VAPID_KEY || VAPID_KEY.length < 50) {
        // VAPID keys are typically ~80+ characters
        return null;
      }

      // Request permission if not granted
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          return null;
        }
      }

      // Get token
      const token = await getToken(this.messagingInstance, {
        vapidKey: VAPID_KEY,
      });

      if (token) {
        this.fcmToken = token;
        console.log('FCM token obtained:', token);

        // Save token to user profile in Firestore
        await this.saveTokenToFirestore(token);

        return token;
      } else {
        return null;
      }
    } catch (error) {
      // Silently return null on any error
      return null;
    }
  }

  // Save token to Firestore
  private async saveTokenToFirestore(token: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        return;
      }

      // Import Firestore
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');

      await setDoc(
        doc(db, 'users', user.uid),
        {
          fcmToken: token,
          tokenUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error saving token to Firestore:', error);
    }
  }

  // Set up foreground message handler
  private setupForegroundHandler(): void {
    if (!this.messagingInstance) {
      return;
    }

    onMessage(this.messagingInstance, (payload) => {
      console.log('Foreground message received:', payload);

      // Show notification
      this.showNotification({
        title: payload.notification?.title || 'Tarang Alert',
        body: payload.notification?.body || 'You have a new notification',
        icon: payload.notification?.icon || '/logo192.png',
        badge: '/logo192.png',
        data: payload.data || {},
        tag: payload.data?.reportId || 'notification',
        requireInteraction: payload.data?.priority === 'high',
      });

      // Dispatch custom event for UI updates
      window.dispatchEvent(
        new CustomEvent('fcm-message', {
          detail: payload,
        })
      );
    });
  }

  // Show browser notification
  showNotification(payload: NotificationPayload): void {
    if (Notification.permission !== 'granted') {
      return;
    }

    // Import audio alert service dynamically to avoid circular dependencies
    try {
      const { audioAlertService } = require('./audioAlertService');
      if (audioAlertService.isAvailable()) {
        const message = payload.body || payload.title || 'You have a new notification';
        const priority = payload.requireInteraction ? 'high' : 'medium';
        audioAlertService.speakAlert(message, 'en', priority);
      }
    } catch (error) {
      // Audio service not available, continue without audio
    }

    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/logo192.png',
      badge: payload.badge || '/logo192.png',
      data: payload.data,
      tag: payload.tag,
      requireInteraction: payload.requireInteraction,
    });

    // Handle notification click
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();

      // Navigate to relevant page if data contains URL
      if (payload.data?.url) {
        window.location.href = payload.data.url;
      }

      notification.close();
    };
  }

  // Set up token refresh
  private setupTokenRefresh(): void {
    // Refresh token every 24 hours
    this.tokenRefreshInterval = setInterval(() => {
      this.getToken();
    }, 24 * 60 * 60 * 1000);
  }

  // Cleanup
  cleanup(): void {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }

  // Get current token
  getCurrentToken(): string | null {
    return this.fcmToken;
  }

  // Check if notifications are supported
  static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  }

  // Check if permission is granted
  static hasPermission(): boolean {
    if (typeof window === 'undefined') return false;
    return Notification.permission === 'granted';
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export class for static methods
export { NotificationService };

// Initialize on module load if supported
if (typeof window !== 'undefined' && NotificationService.isSupported()) {
  // Wait for auth to be ready
  auth.onAuthStateChanged((user) => {
    if (user) {
      notificationService.initialize();
    }
  });
}


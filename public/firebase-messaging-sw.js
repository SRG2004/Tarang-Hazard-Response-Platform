// Firebase Cloud Messaging Service Worker
// This handles background notifications

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Note: Replace with your actual Firebase config
firebase.initializeApp({
  apiKey: "AIzaSyAuGhfE2ULXGm583LO-fqKXdyOQYGptmMg",
  authDomain: "tarang-incois.firebaseapp.com",
  projectId: "tarang-incois",
  storageBucket: "tarang-incois.firebasestorage.app",
  messagingSenderId: "953217940892",
  appId: "1:953217940892:web:b07b188158ca07e47e5c59"
});

// Retrieve Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Tarang Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/logo192.png',
    badge: '/logo192.png',
    data: payload.data || {},
    tag: payload.data?.reportId || 'notification',
    requireInteraction: payload.data?.priority === 'high',
    actions: [
      { action: 'view', title: 'View' },
      { action: 'close', title: 'Close' }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action === 'view' || !event.action) {
    // Open the app or focus existing window
    const urlToOpen = event.notification.data?.url || '/dashboard';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if app is already open
          for (let client of clientList) {
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              return client.focus();
            }
          }
          // Open new window if not
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});

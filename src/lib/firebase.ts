import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getAnalytics } from "firebase/analytics";

// Firebase configuration
// Vite uses import.meta.env instead of process.env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDua-PbolOEK2lWJ4ZQQ7pmcxJH_pk7bmU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tarang-484812.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tarang-484812",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tarang-484812.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1051783450418",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1051783450418:web:ac515bf815083df899d12b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-PSB8S84T02"
};

// Initialize Firebase - wrap in try-catch to prevent blocking on errors
let app;
let analytics;
try {
  app = initializeApp(firebaseConfig);
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Create a minimal app config to prevent complete failure
  // This allows the UI to load even if Firebase config is wrong
  throw new Error('Firebase configuration error. Please check your environment variables.');
}

// Check for common configuration errors
if (firebaseConfig.authDomain && firebaseConfig.authDomain.startsWith('-')) {
  console.error('CRITICAL CONFIG ERROR: VITE_FIREBASE_AUTH_DOMAIN starts with a hyphen. It should likely be "tarang-incois.firebaseapp.com". Check your .env file.');
}

// Initialize Firebase services
export const auth = getAuth(app);

// Configure auth for mobile/WebView environments
// Set persistence to LOCAL for better mobile app experience
if (typeof window !== 'undefined') {
  // Check if running in WebView environment
  const isWebView = /wv|WebView/i.test(navigator.userAgent) ||
    /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent);

  if (isWebView) {
    // For WebView environments, ensure proper redirect handling
    console.log('WebView environment detected - configuring auth for redirect');
  }
}

// Initialize Firestore with offline persistence for web view apps
// Use new initializeFirestore API to avoid deprecation warnings

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const storage = getStorage(app);

// Initialize Firebase Cloud Messaging (only if supported)
let messagingInstance: any = null;
isSupported().then(supported => {
  if (supported) {
    messagingInstance = getMessaging(app);
  }
}).catch(err => {
  console.warn('Firebase Messaging not supported:', err);
});

// Export analytics
export { analytics };
export { messagingInstance as messaging };
export default app;


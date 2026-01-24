// Offline Sync Service - Queues API requests when offline and syncs when online
import apiService from './apiService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../lib/firebase';

interface QueuedRequest {
  id: string;
  type: 'donation' | 'volunteer' | 'report' | 'contact' | 'drill' | 'generic';
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  data: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

const DB_NAME = 'TarangOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'queuedRequests';

class OfflineSyncService {
  private db: IDBDatabase | null = null;
  private syncInProgress = false;
  private listeners: Array<(count: number) => void> = [];

  // Initialize IndexedDB
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Offline sync service initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('status', 'status', { unique: false });
        }
      };

      request.onblocked = () => {
        console.warn('IDB Blocked: Closing old connection to allow upgrade/open');
        if (this.db) {
          this.db.close();
          this.db = null;
        }
      };

    });
  }

  // Check if online - improved for Android WebView
  isOnline(): boolean {
    // Use navigator.onLine as primary check
    if (navigator.onLine === false) {
      return false;
    }

    // In Android WebView, navigator.onLine can be unreliable
    // So we also check if there's an active network connection
    // by attempting a lightweight fetch (but don't actually make the request)
    // For now, trust navigator.onLine but also check connection type if available
    if (typeof (navigator as any).connection !== 'undefined') {
      const connection = (navigator as any).connection;
      // If connection type exists and is 'none', we're offline
      if (connection.type === 'none') {
        return false;
      }
    }

    return true;
  }

  // More reliable network check - non-blocking for web view apps
  async checkNetworkStatus(): Promise<boolean> {
    // Quick check first - don't block on this
    if (!this.isOnline()) {
      return false;
    }

    // For web view apps, don't make blocking network requests
    // This can prevent UI from loading. Instead, trust navigator.onLine
    // and let actual API calls handle network errors gracefully

    // Only do a quick check if we have time (non-blocking)
    try {
      // Use a very short timeout to avoid blocking UI
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500); // 500ms max

      // Try to fetch a cached resource (won't block if offline)
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'force-cache', // Use cache to avoid network request
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok || response.status !== 0;
    } catch (error: any) {
      // Handle AbortError specifically (timeout)
      if (error.name === 'AbortError') {
        // Timeout occurred - assume offline but don't log as error
        return false;
      }
      // If fetch fails for other reasons, assume offline but don't block UI
      // Return false but don't throw - let the app continue
      return false;
    }
  }

  // Queue a request for later sync
  async queueRequest(
    type: QueuedRequest['type'],
    method: QueuedRequest['method'],
    endpoint: string,
    data: any
  ): Promise<string> {
    if (!this.db) {
      await this.init();
    }

    const request: QueuedRequest = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      method,
      endpoint,
      data,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const addRequest = store.add(request);

      addRequest.onsuccess = () => {
        this.notifyListeners();
        console.log('Request queued:', request.id);
        resolve(request.id);
      };

      addRequest.onerror = () => {
        reject(addRequest.error);
      };
    });
  }

  // Get all pending requests with robust error handling
  async getPendingRequests(): Promise<QueuedRequest[]> {
    try {
      if (!this.db) {
        await this.init();
      }
      return await this._getPendingRequestsInternal();
    } catch (error: any) {
      if (this.isConnectionError(error)) {
        console.warn('DB connection lost, re-initializing...');
        this.db = null;
        await this.init();
        return await this._getPendingRequestsInternal();
      }
      throw error;
    }
  }

  // Internal method to actually fetch requests
  private async _getPendingRequestsInternal(): Promise<QueuedRequest[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Helper to identify connection errors
  private isConnectionError(error: any): boolean {
    return error && (
      error.name === 'InvalidStateError' ||
      (error.message && error.message.includes('closing')) ||
      (error.target && error.target.error && error.target.error.name === 'InvalidStateError')
    );
  }

  // Get count of pending requests
  async getPendingCount(): Promise<number> {
    const pending = await this.getPendingRequests();
    return pending.length;
  }

  // Sync all pending requests
  async syncPendingRequests(): Promise<void> {
    if (this.syncInProgress || !this.isOnline()) {
      return;
    }

    this.syncInProgress = true;
    const pending = await this.getPendingRequests();

    console.log(`Syncing ${pending.length} pending requests`);

    for (const request of pending) {
      try {
        await this.syncRequest(request);
      } catch (error) {
        console.error(`Failed to sync request ${request.id}:`, error);
        await this.updateRequestStatus(request.id, 'pending');
      }
    }

    this.syncInProgress = false;
    this.notifyListeners();

    // Trigger background sync if available
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && 'sync' in registration) {
          await (registration as any).sync.register('sync-requests');
        }
      } catch (error) {
        console.warn('Background sync not available:', error);
      }
    }
  }

  // Sync a single request
  private async syncRequest(request: QueuedRequest): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.updateRequestStatus(request.id, 'syncing');

    try {
      // Map request to API service method
      let result: any;

      switch (request.type) {
        case 'report':
          if (request.method === 'POST') {
            // Handle offline report submission
            const { photoFile, videoFile, photoFileName, videoFileName, ...reportData } = request.data;
            let photoURL = null;
            let videoURL = null;

            // Upload files if they were stored as base64
            if (photoFile && photoFileName) {
              try {
                const photoBlob = await base64ToBlob(photoFile);
                // Validate file size (max 10MB)
                if (photoBlob.size > 10 * 1024 * 1024) {
                  console.error('Photo file too large:', photoBlob.size);
                  // Continue without photo if too large
                } else {
                  const photoPath = `reports/${reportData.userId}/${Date.now()}_${photoFileName}`;
                  const photoRef = ref(storage, photoPath);
                  await uploadBytes(photoRef, photoBlob);
                  photoURL = await getDownloadURL(photoRef);
                }
              } catch (error) {
                console.error('Error uploading photo:', error);
                // Continue without photo if upload fails
              }
            }

            if (videoFile && videoFileName) {
              try {
                const videoBlob = await base64ToBlob(videoFile);
                // Validate file size (max 10MB)
                if (videoBlob.size > 10 * 1024 * 1024) {
                  console.error('Video file too large:', videoBlob.size);
                  // Continue without video if too large
                } else {
                  const videoPath = `reports/${reportData.userId}/${Date.now()}_${videoFileName}`;
                  const videoRef = ref(storage, videoPath);
                  await uploadBytes(videoRef, videoBlob);
                  videoURL = await getDownloadURL(videoRef);
                }
              } catch (error) {
                console.error('Error uploading video:', error);
                // Continue without video if upload fails
              }
            }

            // Save to Firestore
            result = await addDoc(collection(db, 'reports'), {
              ...reportData,
              photoURL,
              videoURL,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
          break;
        case 'donation':
          if (request.method === 'POST') {
            result = await apiService.createDonation(request.data);
          }
          break;
        case 'volunteer':
          if (request.method === 'POST') {
            result = await apiService.registerVolunteer(request.data);
          } else if (request.method === 'PATCH') {
            const id = request.endpoint.split('/').pop();
            if (id) {
              result = await apiService.updateVolunteerStatus(id, request.data.status);
            }
          }
          break;
        case 'contact':
          if (request.method === 'POST') {
            result = await apiService.createEmergencyContact(request.data, request.data.adminRole);
          } else if (request.method === 'PUT') {
            const id = request.endpoint.split('/').pop();
            if (id) {
              result = await apiService.updateEmergencyContact(id, request.data, request.data.adminRole);
            }
          } else if (request.method === 'DELETE') {
            const id = request.endpoint.split('/').pop();
            if (id) {
              result = await apiService.deleteEmergencyContact(id, request.data.adminRole);
            }
          }
          break;
        case 'drill':
          if (request.method === 'POST') {
            result = await apiService.createHazardDrill(request.data, request.data.adminRole);
          } else if (request.method === 'PUT') {
            const id = request.endpoint.split('/').pop();
            if (id) {
              result = await apiService.updateHazardDrill(id, request.data, request.data.adminRole);
            }
          } else if (request.method === 'DELETE') {
            const id = request.endpoint.split('/').pop();
            if (id) {
              result = await apiService.deleteHazardDrill(id, request.data.adminRole);
            }
          }
          break;
        default:
          // Generic API call using fetch
          const response = await fetch(request.endpoint, {
            method: request.method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request.data),
          });
          result = await response.json();
      }

      // Mark as completed and delete
      await this.deleteRequest(request.id);
      console.log(`Request ${request.id} synced successfully`);
    } catch (error) {
      // Increment retries
      request.retries += 1;
      if (request.retries >= 3) {
        await this.updateRequestStatus(request.id, 'failed');
      } else {
        await this.updateRequestStatus(request.id, 'pending');
      }
      throw error;
    }
  }

  // Update request status
  private async updateRequestStatus(id: string, status: QueuedRequest['status']): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const request = getRequest.result;
        if (request) {
          request.status = status;
          const updateRequest = store.put(request);
          updateRequest.onsuccess = () => {
            this.notifyListeners();
            resolve();
          };
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Delete a request
  private async deleteRequest(id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const deleteRequest = store.delete(id);

      deleteRequest.onsuccess = () => {
        this.notifyListeners();
        resolve();
      };

      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  }

  // Clear all completed/failed requests
  async clearCompletedRequests(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('status');
      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const req = cursor.value as QueuedRequest;
          if (req.status === 'completed' || req.status === 'failed') {
            cursor.delete();
          }
          cursor.continue();
        } else {
          this.notifyListeners();
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Subscribe to pending count changes
  subscribe(listener: (count: number) => void): () => void {
    this.listeners.push(listener);
    // Immediately notify with current count
    this.getPendingCount().then(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners
  private async notifyListeners(): Promise<void> {
    const count = await this.getPendingCount();
    this.listeners.forEach(listener => listener(count));
  }
}

// Helper function to convert base64 to Blob
async function base64ToBlob(base64: string): Promise<Blob> {
  try {
    // Handle both data URLs and plain base64 strings
    if (base64.startsWith('data:')) {
      const response = await fetch(base64);
      return await response.blob();
    } else {
      // If it's plain base64, convert it
      const byteCharacters = atob(base64.split(',')[1] || base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray]);
    }
  } catch (error) {
    console.error('Error converting base64 to Blob:', error);
    throw new Error('Failed to convert file data. File may be corrupted.');
  }
}

// Export singleton instance
export const offlineSyncService = new OfflineSyncService();

// Initialize on module load
offlineSyncService.init().catch(console.error);

// Auto-sync when coming online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Connection restored, syncing pending requests...');
    offlineSyncService.syncPendingRequests();
  });

  // Periodic sync check (every 30 seconds when online)
  setInterval(() => {
    if (navigator.onLine) {
      offlineSyncService.syncPendingRequests();
    }
  }, 30000);
}


// Offline Sync Service - Mobile Version
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiService } from './apiService'; // Assuming you have a mobile apiService
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { app } from '../config'; // Import initialized firebase app

const db = getFirestore(app);
const storage = getStorage(app);

export interface QueuedRequest {
    id: string;
    type: 'donation' | 'volunteer' | 'report' | 'contact' | 'drill' | 'generic';
    method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    endpoint: string;
    data: any;
    timestamp: number;
    retries: number;
    status: 'pending' | 'syncing' | 'completed' | 'failed';
}

const STORAGE_KEY = 'offline_request_queue';

class OfflineSyncService {
    private syncInProgress = false;
    private listeners: Array<(count: number) => void> = [];

    // Initialize service
    constructor() {
        this.init();
    }

    async init() {
        // Setup NetInfo listener for auto-sync
        NetInfo.addEventListener(state => {
            if (state.isConnected && state.isInternetReachable) {
                console.log('Online detected, attempting sync...');
                this.syncPendingRequests();
            }
        });
    }

    // Check network status
    async isOnline(): Promise<boolean> {
        const state = await NetInfo.fetch();
        return !!(state.isConnected && state.isInternetReachable);
    }

    // Queue a request
    async queueRequest(
        type: QueuedRequest['type'],
        method: QueuedRequest['method'],
        endpoint: string,
        data: any
    ): Promise<string> {
        const pendingList = await this.getPendingRequests();

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

        pendingList.push(request);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pendingList));

        this.notifyListeners();
        console.log('[OfflineSync] Request queued:', request.id);
        return request.id;
    }

    // Get all pending requests
    async getPendingRequests(): Promise<QueuedRequest[]> {
        try {
            const json = await AsyncStorage.getItem(STORAGE_KEY);
            return json ? JSON.parse(json) : [];
        } catch (e) {
            console.error('Failed to load offline queue:', e);
            return [];
        }
    }

    // Get count
    async getPendingCount(): Promise<number> {
        const list = await this.getPendingRequests();
        return list.length;
    }

    // Sync loop
    async syncPendingRequests(): Promise<void> {
        if (this.syncInProgress) return;

        const isOnline = await this.isOnline();
        if (!isOnline) return;

        this.syncInProgress = true;
        const allRequests = await this.getPendingRequests();
        const pending = allRequests.filter(r => r.status === 'pending' || r.status === 'failed'); // Retry failed ones too

        if (pending.length === 0) {
            this.syncInProgress = false;
            return;
        }

        console.log(`[OfflineSync] Syncing ${pending.length} requests...`);

        for (const request of pending) {
            try {
                await this.syncRequest(request);
                // Remove successful request immediately
                await this.removeRequest(request.id);
            } catch (error) {
                console.error(`[OfflineSync] Failed to sync ${request.id}:`, error);
                // Update retry count and persist
                await this.updateRequestStatus(request.id, 'failed', true);
            }
        }

        this.syncInProgress = false;
        this.notifyListeners();
    }

    // Sync individual request
    private async syncRequest(request: QueuedRequest): Promise<void> {
        // Mark as syncing (optional, mainly for UI if we were observing specifics)
        // await this.updateRequestStatus(request.id, 'syncing');

        let result: any;

        switch (request.type) {
            case 'report':
                if (request.method === 'POST') {
                    const { photoFile, videoFile, photoFileName, videoFileName, ...reportData } = request.data;
                    let photoURL = null;
                    let videoURL = null;

                    // Handle File Uploads (Expect base64 in mobile context usually, or file URI)
                    // Mobile app sends file URIs usually, which fetch() can handle or need to read as blob
                    if (photoFile) {
                        photoURL = await this.uploadFile(photoFile, `reports/${reportData.userId}/${Date.now()}_${photoFileName || 'photo.jpg'}`);
                    }
                    if (videoFile) {
                        videoURL = await this.uploadFile(videoFile, `reports/${reportData.userId}/${Date.now()}_${videoFileName || 'video.mp4'}`);
                    }

                    result = await addDoc(collection(db, 'reports'), {
                        ...reportData,
                        photoURL,
                        videoURL,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                }
                break;

            // Add other cases (donation, volunteer, etc) as needed for mobile
            // For now, focusing on Report as that's the primary offline use case

            default:
                // Fallback to generic fetch if endpoint provided (needs full URL)
                // Note: request.endpoint might be relative in web, mobile needs full URL or apiService handling
                console.warn('Generic sync not fully implemented for type:', request.type);
                break;
        }

        console.log(`[OfflineSync] Request ${request.id} completed.`);
    }

    // Helper file upload
    private async uploadFile(uri: string, path: string): Promise<string | null> {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const fileRef = ref(storage, path);
            await uploadBytes(fileRef, blob);
            return await getDownloadURL(fileRef);
        } catch (e) {
            console.error("Upload failed in sync", e);
            return null;
        }
    }

    private async updateRequestStatus(id: string, status: QueuedRequest['status'], incrementRetry = false) {
        const all = await this.getPendingRequests();
        const idx = all.findIndex(r => r.id === id);
        if (idx !== -1) {
            all[idx].status = status;
            if (incrementRetry) all[idx].retries += 1;
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        }
    }

    private async removeRequest(id: string) {
        const all = await this.getPendingRequests();
        const filtered = all.filter(r => r.id !== id);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        this.notifyListeners();
    }

    subscribe(listener: (count: number) => void): () => void {
        this.listeners.push(listener);
        this.getPendingCount().then(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private async notifyListeners() {
        const count = await this.getPendingCount();
        this.listeners.forEach(l => l(count));
    }
}

export const offlineSyncService = new OfflineSyncService();

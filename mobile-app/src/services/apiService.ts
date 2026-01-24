import axios from 'axios';
import { auth } from '../lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Helper to manage local cache with AsyncStorage
const CACHE_PREFIX = 'api_cache_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

const getCache = async (key: string) => {
    try {
        const cached = await AsyncStorage.getItem(CACHE_PREFIX + key);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > CACHE_EXPIRY) {
            await AsyncStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        return data;
    } catch (e) {
        console.warn('Error reading from cache:', e);
        return null;
    }
};

const setCache = async (key: string, data: any) => {
    try {
        const cacheItem = {
            data,
            timestamp: Date.now()
        };
        await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheItem));
    } catch (e) {
        console.warn('Error writing to cache:', e);
    }
};

import NetInfo from '@react-native-community/netinfo';

import { InternalAxiosRequestConfig } from 'axios';

// Request interceptor
apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
            // If offline and it's a GET request, try to serve from cache immediately
            if (config.method === 'get' && config.url) {
                const cachedData = await getCache(config.url);
                if (cachedData) {
                    // Throw a special error that we can catch in the response interceptor (or handle here if axios allowed)
                    // Axios doesn't easily allow returning a response from request interceptor without throwing.
                    // So we attach an adapter.
                    config.adapter = async () => {
                        return {
                            data: cachedData,
                            status: 200,
                            statusText: 'OK (Cached)',
                            headers: {},
                            config,
                            request: {}
                        };
                    };
                    return config;
                }
            }
        }

        const currentUser = auth.currentUser;
        if (currentUser) {
            try {
                const token = await currentUser.getIdToken();
                config.headers.Authorization = `Bearer ${token}`;
            } catch (error) {
                console.error('Error getting auth token:', error);
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
    (response) => {
        if (response.config.method === 'get' && response.config.url) {
            setCache(response.config.url, response.data);
        }
        return response;
    },
    async (error) => {
        // Basic offline cache fallback for GET requests
        if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
            if (error.config && error.config.method === 'get' && error.config.url) {
                const cachedData = await getCache(error.config.url);
                if (cachedData) {
                    return {
                        data: cachedData,
                        status: 200,
                        statusText: 'OK (Cached)',
                        headers: {},
                        config: error.config,
                        request: {}
                    };
                }
            }
        }
        return Promise.reject(error);
    }
);

// --- API Methods ---

export const getReports = async (filters?: any) => {
    try {
        const response = await apiClient.get('/reports', { params: filters });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching reports:', error);
        return { success: false, error: error.message, reports: [] };
    }
};

export const createReport = async (reportData: any) => {
    try {
        const response = await apiClient.post('/reports', reportData);
        return response.data;
    } catch (error: any) {
        console.error('Error creating report:', error);
        throw error;
    }
};

export const verifyReport = async (reportId: string, verifiedBy: string, verifierRole: string) => {
    try {
        const response = await apiClient.post(`/reports/verify/${reportId}`, {
            verifiedBy,
            verifierRole,
        });
        return response.data;
    } catch (error: any) {
        console.error('Error verifying report:', error);
        throw error;
    }
};

export const rejectReport = async (reportId: string, rejectedBy: string, rejectorRole: string, reason?: string) => {
    try {
        const response = await apiClient.post(`/reports/reject/${reportId}`, {
            rejectedBy,
            rejectorRole,
            reason,
        });
        return response.data;
    } catch (error: any) {
        console.error('Error rejecting report:', error);
        throw error;
    }
};

export const solveReport = async (reportId: string, solvedBy: string, solverRole: string, notes?: string) => {
    try {
        const response = await apiClient.post(`/reports/solve/${reportId}`, {
            solvedBy,
            solverRole,
            notes,
        });
        return response.data;
    } catch (error: any) {
        console.error('Error solving report:', error);
        throw error;
    }
};



export const getDashboardAnalytics = async (filters?: any) => {
    try {
        const response = await apiClient.get('/analytics/dashboard', { params: filters });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching dashboard analytics:', error);
        return { success: false, error: error.message, analytics: null };
    }
};



export const getUserCount = async (role: string) => {
    try {
        const response = await apiClient.get('/users/count', { params: { role } });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching user count:', error);
        return { count: 0 };
    }
};

export const getFlashSMSStatus = async () => {
    try {
        const response = await apiClient.get('/alerts/flash-sms/status');
        return response.data;
    } catch (error: any) {
        console.error('Error fetching SMS status:', error);
        throw error;
    }
};

export const getFlashSMSHistory = async (role: string) => {
    try {
        const response = await apiClient.get('/alerts/flash-sms/history', { params: { role } });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching SMS history:', error);
        return [];
    }
};

export const sendFlashSMS = async (message: string, role: string, userId: string) => {
    try {
        const response = await apiClient.post('/alerts/flash-sms', {
            message,
            role,
            userId
        });
        return response.data;
    } catch (error: any) {
        console.error('Error sending flash SMS:', error);
        return { success: false, message: error.message };
    }
};

export const getSocialMediaReports = async (platform?: string, limit: number = 100) => {
    try {
        const response = await apiClient.get('/social-media/posts', { params: { platform, limit } });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching social media posts:', error);
        return { success: false, reports: [] };
    }
};

export const getMonitoringStatus = async () => {
    try {
        const response = await apiClient.get('/social-media/status');
        return response.data;
    } catch (error: any) {
        console.error('Error fetching monitoring status:', error);
        return { success: false, status: 'unknown' };
    }
};

export const monitorSocialMedia = async () => {
    try {
        const response = await apiClient.post('/social-media/monitor');
        return response.data;
    } catch (error: any) {
        console.error('Error starting monitoring:', error);
        throw error;
    }
};

export const getVerificationData = async (postId: string) => {
    try {
        const response = await apiClient.get(`/social-media/verification-data/${postId}`);
        return response.data;
    } catch (error: any) {
        console.error('Error fetching verification data:', error);
        return { success: false };
    }
};

export const verifySocialMediaPost = async (postId: string, verified: boolean, notes: string, comparisonNotes: string) => {
    try {
        const response = await apiClient.post(`/social-media/verify/${postId}`, {
            verified,
            notes,
            comparisonNotes
        });
        return response.data;
    } catch (error: any) {
        console.error('Error verifying post:', error);
        throw error;
    }
};

export const getFishingZones = async () => {
    try {
        const response = await apiClient.get('/fishing-zones');
        return response.data;
    } catch (error: any) {
        console.error('Error fetching fishing zones:', error);
        return { success: false, zones: [] };
    }
};

export const createFishingZone = async (data: any) => {
    try {
        const response = await apiClient.post('/fishing-zones', data);
        return response.data;
    } catch (error: any) {
        console.error('Error creating fishing zone:', error);
        throw error;
    }
};

export const updateFishingZone = async (id: string, data: any) => {
    try {
        const response = await apiClient.put(`/fishing-zones/${id}`, data);
        return response.data;
    } catch (error: any) {
        console.error('Error updating fishing zone:', error);
        throw error;
    }
};

export const deleteFishingZone = async (id: string) => {
    try {
        const response = await apiClient.delete(`/fishing-zones/${id}`);
        return response.data;
    } catch (error: any) {
        console.error('Error deleting fishing zone:', error);
        throw error;
    }
};

export const updateFishingZoneStatus = async (id: string, status: string) => {
    try {
        const response = await apiClient.patch(`/fishing-zones/${id}/status`, { status });
        return response.data;
    } catch (error: any) {
        console.error('Error updating fishing zone status:', error);
        throw error;
    }
};

export const getCirculars = async () => {
    try {
        const response = await apiClient.get('/circulars');
        return response.data;
    } catch (error: any) {
        console.error('Error fetching circulars:', error);
        return { success: false, circulars: [] };
    }
};

export const createCircular = async (data: any) => {
    try {
        const response = await apiClient.post('/circulars', data);
        return response.data;
    } catch (error: any) {
        console.error('Error creating circular:', error);
        throw error;
    }
};

export const updateCircular = async (id: string, data: any) => {
    try {
        const response = await apiClient.put(`/circulars/${id}`, data);
        return response.data;
    } catch (error: any) {
        console.error('Error updating circular:', error);
        throw error;
    }
};

export const deleteCircular = async (id: string) => {
    try {
        const response = await apiClient.delete(`/circulars/${id}`);
        return response.data;
    } catch (error: any) {
        console.error('Error deleting circular:', error);
        throw error;
    }
};

export const getDonations = async () => {
    try {
        const response = await apiClient.get('/donations');
        return response.data;
    } catch (error: any) {
        console.error('Error fetching donations:', error);
        return { success: false, donations: [] };
    }
};

export const createDonation = async (donationData: any) => {
    try {
        const response = await apiClient.post('/donations', donationData);
        return response.data;
    } catch (error: any) {
        console.error('Error creating donation:', error);
        throw error;
    }
};

export const getVolunteers = async () => {
    try {
        const response = await apiClient.get('/volunteers');
        return response.data;
    } catch (error: any) {
        console.error('Error fetching volunteers:', error);
        return { success: false, volunteers: [] };
    }
};

export const registerVolunteer = async (volunteerData: any) => {
    try {
        const response = await apiClient.post('/volunteers/register', volunteerData);
        return response.data;
    } catch (error: any) {
        console.error('Error registering volunteer:', error);
        throw error;
    }
};

export const updateVolunteerStatus = async (id: string, status: string) => {
    try {
        const response = await apiClient.patch(`/volunteers/${id}/status`, { status });
        return response.data;
    } catch (error: any) {
        console.error('Error updating volunteer status:', error);
        throw error;
    }
};

export const getUsers = async (filters?: any) => {
    try {
        const response = await apiClient.get('/users', { params: filters });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching users:', error);
        return { success: false, users: [] };
    }
};

export const updateUserRole = async (userId: string, role: string, adminId: string, adminRole: string) => {
    try {
        const response = await apiClient.patch(`/users/${userId}/role`, { role, adminId, adminRole });
        return response.data;
    } catch (error: any) {
        console.error('Error updating user role:', error);
        throw error;
    }
};

export const blockUser = async (userId: string, blocked: boolean, reason?: string) => {
    try {
        const response = await apiClient.patch(`/users/${userId}/block`, { blocked, reason });
        return response.data;
    } catch (error: any) {
        console.error('Error blocking user:', error);
        throw error;
    }
};

export const deleteUser = async (userId: string, adminId: string, adminRole: string) => {
    try {
        const response = await apiClient.delete(`/users/${userId}`, { data: { adminId, adminRole } });
        return response.data;
    } catch (error: any) {
        console.error('Error deleting user:', error);
        throw error;
    }
};

export const createUser = async (email: string, name: string, role: string, phone?: string) => {
    try {
        const response = await apiClient.post('/users', { email, name, role, phone });
        return response.data;
    } catch (error: any) {
        console.error('Error creating user:', error);
        throw error;
    }
};

export const getUserProfile = async (userId: string) => {
    try {
        const response = await apiClient.get(`/users/${userId}`);
        return response.data;
    } catch (error: any) {
        console.error('Error fetching user profile:', error);
        // Fallback or rethrow? Rethrow so login can fail if profile fetch fails?
        // Or maybe return null?
        // If we can't verify role, maybe we shouldn't let them in if we are strict.
        throw error;
    }
};

export const getModels = async () => {
    try {
        const response = await apiClient.get('/ml/models');
        return response.data;
    } catch (error: any) {
        console.error('Error fetching models:', error);
        return { success: false, models: [] };
    }
};

export const getTrainingJobs = async (limit: number = 20) => {
    try {
        const response = await apiClient.get('/ml/jobs', { params: { limit } });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching training jobs:', error);
        return { success: false, jobs: [] };
    }
};

export const getHazardPredictions = async (params?: any) => {
    try {
        const response = await apiClient.get('/ml/predictions', { params });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching predictions:', error);
        return { success: false, predictions: [] };
    }
};

export const trainModel = async () => {
    try {
        const response = await apiClient.post('/ml/train');
        return response.data;
    } catch (error: any) {
        console.error('Error starting training:', error);
        throw error;
    }
};

// Hazard Drills
export const getHazardDrills = async () => {
    try {
        const response = await apiClient.get('/drills');
        return response.data;
    } catch (error: any) {
        console.error('Error fetching hazard drills:', error);
        return { success: false, drills: [] };
    }
};

export const createHazardDrill = async (data: any) => {
    try {
        const response = await apiClient.post('/drills', data);
        return response.data;
    } catch (error: any) {
        console.error('Error creating hazard drill:', error);
        throw error;
    }
};

export const updateHazardDrill = async (id: string, data: any) => {
    try {
        const response = await apiClient.put(`/drills/${id}`, data);
        return response.data;
    } catch (error: any) {
        console.error('Error updating hazard drill:', error);
        throw error;
    }
};

export const deleteHazardDrill = async (id: string) => {
    try {
        const response = await apiClient.delete(`/drills/${id}`);
        return response.data;
    } catch (error: any) {
        console.error('Error deleting hazard drill:', error);
        throw error;
    }
};

// Emergency Contacts
export const getEmergencyContacts = async () => {
    try {
        const response = await apiClient.get('/contacts');
        return response.data;
    } catch (error: any) {
        console.error('Error fetching emergency contacts:', error);
        return { success: false, contacts: [] };
    }
};

export const createEmergencyContact = async (data: any) => {
    try {
        const response = await apiClient.post('/contacts', data);
        return response.data;
    } catch (error: any) {
        console.error('Error creating emergency contact:', error);
        throw error;
    }
};

export const updateEmergencyContact = async (id: string, data: any) => {
    try {
        const response = await apiClient.put(`/contacts/${id}`, data);
        return response.data;
    } catch (error: any) {
        console.error('Error updating emergency contact:', error);
        throw error;
    }
};

export const deleteEmergencyContact = async (id: string) => {
    try {
        const response = await apiClient.delete(`/contacts/${id}`);
        return response.data;
    } catch (error: any) {
        console.error('Error deleting emergency contact:', error);
        throw error;
    }
};

export const chatWithBot = async (message: string, history: any[] = []) => {
    try {
        const response = await apiClient.post('/ai/chat', { message, history });
        return response.data;
    } catch (error: any) {
        console.error('Error chatting with bot:', error);
        // Fallback for offline or error
        return {
            success: false,
            response: "I'm having trouble connecting to the server. Please check your internet connection."
        };
    }
};

export default apiClient;

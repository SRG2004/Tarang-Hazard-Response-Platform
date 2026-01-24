// API Service v2.1 - Cache-busting rebuild
import axios from 'axios';
import { offlineSyncService } from './offlineSyncService';
import { auth } from '../lib/firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Helper function to detect network errors (works in Android WebView)
function isNetworkError(error: any): boolean {
  if (!error) return false;

  // Check if navigator.onLine is false (primary check)
  if (!navigator.onLine) {
    return true;
  }

  // Check for network error codes (common in Android WebView)
  if (error.code === 'ERR_NETWORK' ||
    error.code === 'ERR_INTERNET_DISCONNECTED' ||
    error.code === 'ERR_NETWORK_CHANGED' ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'NETWORK_ERROR') {
    return true;
  }

  // Check for network-related error messages
  const errorMessage = error.message?.toLowerCase() || '';
  if (errorMessage.includes('network error') ||
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('no internet') ||
    errorMessage.includes('internet')) {
    return true;
  }

  // If there's no response but there was a request, it's likely a network error
  if (!error.response && error.request) {
    return true;
  }

  return false;
}

// Helper function to manage local cache
const CACHE_PREFIX = 'api_cache_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

const getCache = (key: string) => {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data;
  } catch (e) {
    console.warn('Error reading from cache:', e);
    return null;
  }
};

const setCache = (key: string, data: any) => {
  try {
    const cacheItem = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheItem));
  } catch (e) {
    console.warn('Error writing to cache (likely quota exceeded):', e);
  }
};

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Get current user and token
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (error) {
        console.error('Error getting auth token:', error);
        // Continue without token - some endpoints might not require auth
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle network errors and offline scenarios
apiClient.interceptors.response.use(
  (response) => {
    // Cache successful GET requests
    if (response.config.method === 'get' && response.config.url) {
      setCache(response.config.url, response.data);
    }
    return response;
  },
  async (error) => {
    // Check if it's a network error (offline scenario)
    if (isNetworkError(error)) {
      console.log('Network error detected:', error.message);

      // Try to serve from cache for GET requests
      if (error.config && error.config.method === 'get' && error.config.url) {
        const cachedData = getCache(error.config.url);
        if (cachedData) {
          console.log('Serving from cache:', error.config.url);
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

      // Don't throw immediately - let the calling function handle it
      // This allows the offline queue to intercept
    }

    return Promise.reject(error);
  }
);

// Helper function to handle offline requests
async function handleRequest<T>(
  requestFn: () => Promise<T>,
  offlineQueue: {
    type: 'donation' | 'volunteer' | 'report' | 'contact' | 'drill' | 'generic';
    method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    endpoint: string;
    data: any;
  }
): Promise<T> {
  // Check if online first - use quick check, don't block
  // For web view apps, navigator.onLine is usually reliable
  const quickOnlineCheck = navigator.onLine && offlineSyncService.isOnline();

  if (!quickOnlineCheck) {
    // Queue the request immediately without waiting
    offlineSyncService.queueRequest(
      offlineQueue.type,
      offlineQueue.method,
      `${API_BASE_URL}${offlineQueue.endpoint}`,
      offlineQueue.data
    ).catch(err => {
      console.error('Error queueing offline request:', err);
      // Don't throw - just log the error
    });
    // Return a promise that resolves immediately (for UI feedback)
    return Promise.resolve({ success: true, queued: true, message: 'Request queued for offline sync' } as T);
  }

  try {
    // Try the request
    return await requestFn();
  } catch (error: any) {
    // If it's a network error or server error (500+), queue it for retry
    if (isNetworkError(error) || (error.response?.status >= 500)) {
      await offlineSyncService.queueRequest(
        offlineQueue.type,
        offlineQueue.method,
        `${API_BASE_URL}${offlineQueue.endpoint}`,
        offlineQueue.data
      );
      return Promise.resolve({ success: true, queued: true, message: 'Request queued due to network issue. Will sync when online.' } as T);
    }

    // For other errors (4xx client errors), throw normally
    throw error;
  }
}

// ==================== REPORTS ====================

export const verifyReport = async (
  reportId: string,
  verifiedBy: string,
  verifierRole: string
) => {
  try {
    const response = await apiClient.post(`/reports/verify/${reportId}`, {
      verifiedBy,
      verifierRole,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error verifying report:', error);

    // If offline or network error, queue for sync
    if (isNetworkError(error)) {
      await offlineSyncService.queueRequest(
        'generic',
        'POST',
        `${API_BASE_URL}/reports/verify/${reportId}`,
        { verifiedBy, verifierRole }
      );
      return { success: true, queued: true, message: 'Request queued. Will sync when online.' };
    }

    // Re-throw with better error message for non-network errors
    const errorMessage = error.response?.data?.error || error.message || 'Failed to verify report';
    throw new Error(errorMessage);
  }
};

export const rejectReport = async (
  reportId: string,
  rejectedBy: string,
  rejectorRole: string,
  reason?: string
) => {
  try {
    const response = await apiClient.post(`/reports/reject/${reportId}`, {
      rejectedBy,
      rejectorRole,
      reason,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error rejecting report:', error);

    // If offline or network error, queue for sync
    if (isNetworkError(error)) {
      await offlineSyncService.queueRequest(
        'generic',
        'POST',
        `${API_BASE_URL}/reports/reject/${reportId}`,
        { rejectedBy, rejectorRole, reason }
      );
      return { success: true, queued: true, message: 'Request queued. Will sync when online.' };
    }

    // Re-throw with better error message for non-network errors
    const errorMessage = error.response?.data?.error || error.message || 'Failed to reject report';
    throw new Error(errorMessage);
  }
};

export const solveReport = async (
  reportId: string,
  solvedBy: string,
  solverRole: string,
  notes?: string
) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.post(`/reports/solve/${reportId}`, {
      solvedBy,
      solverRole,
      notes,
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error solving report:', error);

    // If offline or network error, queue for sync
    if (isNetworkError(error)) {
      await offlineSyncService.queueRequest(
        'generic',
        'POST',
        `${API_BASE_URL}/reports/solve/${reportId}`,
        { solvedBy, solverRole, notes }
      );
      return { success: true, queued: true, message: 'Request queued. Will sync when online.' };
    }

    // Re-throw with better error message for non-network errors
    const errorMessage = error.response?.data?.error || error.message || 'Failed to solve report';
    throw new Error(errorMessage);
  }
};

export const reanalyzeReport = async (reportId: string) => {
  try {
    const response = await apiClient.post('/reports/reanalyze', { reportId });
    return response.data;
  } catch (error: any) {
    console.error('Error re-analyzing report:', error);
    // If offline, queue it? Probably not needed for this admin action but can't hurt
    if (isNetworkError(error)) {
      return { success: false, error: 'Network error. Cannot re-analyze offline.' };
    }
    throw new Error(error.response?.data?.error || error.message || 'Failed to re-analyze report');
  }
};

export const getReports = async (filters?: {
  status?: string;
  severity?: string;
  userId?: string;
}) => {
  try {
    const response = await apiClient.get('/reports', { params: filters });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    console.error('API URL:', `${API_BASE_URL}/reports`, 'Filters:', filters);
    // Return error response structure
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch reports',
      reports: []
    };
  }
};

// ==================== DATA EXPORTS ====================

export const exportData = async (
  dataType: 'reports' | 'volunteers' | 'donations' | 'analytics',
  format: 'csv' | 'json' | 'excel',
  dateRange?: {
    startDate?: string;
    endDate?: string;
  }
) => {
  try {
    // Get auth token for authenticated request
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.post(`/export/${dataType}`, {
      format,
      ...dateRange,
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Export API error:', error);
    throw error;
  }
};


// ==================== VOLUNTEERS ====================

export const registerVolunteer = async (volunteer: {
  userId: string;
  userName: string;
  userEmail: string;
  phone: string;
  location: string;
  skills?: string[];
  availability?: string;
  experience?: string;
}) => {
  return handleRequest(
    async () => {
      const response = await apiClient.post('/volunteers/register', volunteer);
      return response.data;
    },
    {
      type: 'volunteer',
      method: 'POST',
      endpoint: '/volunteers/register',
      data: volunteer,
    }
  );
};

export const getVolunteers = async (filters?: { status?: string; role?: string }) => {
  try {
    // Get auth token for authenticated request
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.get('/volunteers', {
      params: filters,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Handle response structure
    if (response.data && response.data.success && response.data.volunteers) {
      // Add mock coordinates if missing for map demo (use consistent hash-based location)
      const volunteersWithLocation = (response.data.volunteers || []).map((v: any) => {
        // Generate consistent mock location based on user ID (not random)
        if (!v.latitude || !v.longitude) {
          // Use hash of user ID for consistent location
          let hash = 0;
          for (let i = 0; i < v.id.length; i++) {
            hash = ((hash << 5) - hash) + v.id.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
          }
          const mockLat = 10 + (Math.abs(hash) % 1000) / 100; // 10-20 range
          const mockLng = 75 + (Math.abs(hash) % 500) / 100;  // 75-80 range
          return {
            ...v,
            latitude: mockLat,
            longitude: mockLng,
            hasMockLocation: true
          };
        }
        return v;
      });
      return { success: true, volunteers: volunteersWithLocation };
    } else if (response.data && response.data.volunteers && Array.isArray(response.data.volunteers)) {
      // Handle direct array response
      const volunteersWithLocation = response.data.volunteers.map((v: any) => ({
        ...v,
        latitude: v.latitude || (Math.random() * (20 - 10) + 10),
        longitude: v.longitude || (Math.random() * (80 - 75) + 75),
      }));
      return { success: true, volunteers: volunteersWithLocation };
    } else {
      console.warn('Unexpected volunteers response format:', response.data);
      return { success: false, volunteers: [] };
    }
  } catch (error: any) {
    console.error('Error fetching volunteers:', error);
    console.error('API URL:', `${API_BASE_URL}/volunteers`, 'Filters:', filters);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch volunteers',
      volunteers: []
    };
  }
};

export const updateVolunteerStatus = async (
  volunteerId: string,
  status: 'active' | 'inactive' | 'deployed'
) => {
  return handleRequest(
    async () => {
      const response = await apiClient.patch(`/volunteers/${volunteerId}/status`, {
        status,
      });
      return response.data;
    },
    {
      type: 'volunteer',
      method: 'PATCH',
      endpoint: `/volunteers/${volunteerId}/status`,
      data: { status },
    }
  );
};

// ==================== USER MANAGEMENT ====================

export const createUser = async (email: string, name: string, role: string, phone?: string, aadharId?: string) => {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.post('/users', {
      email,
      name,
      role,
      phone,
      aadharId
    }, {
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error creating user:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to create user');
  }
};

export const getUsers = async (filters?: { role?: string }) => {
  try {
    // Get auth token for authenticated request
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.get('/users', {
      params: filters,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching users:', error);
    console.error('API URL:', `${API_BASE_URL}/users`, 'Filters:', filters);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch users',
      users: []
    };
  }
};

export const updateUserRole = async (
  userId: string,
  role: string,
  updatedBy: string,
  updaterRole: string
) => {
  try {
    // Get auth token for authenticated request
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.patch(`/users/${userId}/role`, {
      role,
      updatedBy,
      updaterRole,
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

export const deleteUser = async (
  userId: string,
  deletedBy: string,
  deleterRole: string
) => {
  try {
    // Get auth token for authenticated request
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.delete(`/users/${userId}`, {
      data: {
        deletedBy,
        deleterRole
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

export const blockUser = async (
  userId: string,
  blocked: boolean,
  reason?: string
) => {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.patch(`/users/${userId}/block`, {
      blocked,
      reason
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error blocking/unblocking user:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to block/unblock user');
  }
};

// ==================== ANALYTICS ====================

export const getDashboardAnalytics = async (filters?: {
  userId?: string;
  role?: string;
}) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.get('/analytics/dashboard', {
      params: filters,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching dashboard analytics:', error);
    console.error('API URL:', `${API_BASE_URL}/analytics/dashboard`, 'Filters:', filters);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch dashboard analytics',
      analytics: null
    };
  }
};

// ==================== SOCIAL MEDIA ====================

export const processSocialMediaPosts = async (posts: any[]) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.post('/social-media/process', { posts }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error processing social media posts:', error);
    throw error;
  }
};

export const monitorSocialMedia = async (platforms?: string[]) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.post('/social-media/monitor', { platforms }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error starting social media monitoring:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to start monitoring';
    throw new Error(errorMessage);
  }
};

export const getSocialMediaReports = async (platform?: string, limit?: number) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.get('/social-media/reports', {
      params: { platform, limit },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching social media reports:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch social media reports',
      reports: []
    };
  }
};

export const fetchINCOISData = async (cities?: Array<{ name: string; lat: number; lon: number }>) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.post('/incois/fetch-data', {
      cities
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Error fetching INCOIS data:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch INCOIS data');
  }
};

export const getHazardPredictions = async (filters?: { status?: string; severity?: string; limit?: number }) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get(`/ai/predictions?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Error fetching hazard predictions:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch predictions');
  }
};

export const testSocialMediaServices = async (service?: 'twitter' | 'threads' | 'youtube') => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.post('/social-media/test-services', {
      service
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error: any) {
    console.error('Error testing social media services:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to test services');
  }
};

export const getMonitoringStatus = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.get('/social-media/monitoring-status', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching monitoring status:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch monitoring status',
      status: 'idle'
    };
  }
};

// Get verification data for a social media post (with comparison)
export const getVerificationData = async (postId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.get(`/social-media/reports/${postId}/verification-data`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching verification data:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch verification data';
    throw new Error(errorMessage);
  }
};

// Verify a social media post
export const verifySocialMediaPost = async (postId: string, verified: boolean, notes?: string, comparisonNotes?: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.post(`/social-media/reports/${postId}/verify`, {
      verified,
      notes,
      comparisonNotes
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error verifying post:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to verify post';
    throw new Error(errorMessage);
  }
};

// ==================== NOTIFICATIONS ====================

export const sendEmailNotification = async (notification: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) => {
  const response = await apiClient.post('/notifications/email', notification);
  return response.data;
};

export const sendPushNotification = async (notification: {
  token: string;
  title: string;
  body: string;
  data?: any;
}) => {
  const response = await apiClient.post('/notifications/push', notification);
  return response.data;
};

export const sendDailyDigests = async () => {
  const response = await apiClient.post('/notifications/daily-digest');
  return response.data;
};

// ==================== HAZARD DRILLS ====================

export const getHazardDrills = async () => {
  const response = await apiClient.get('/drills');
  return response.data;
};

export const createHazardDrill = async (drillData: any, adminRole: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.post('/drills', { ...drillData, adminRole }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error creating hazard drill:', error);
    // If offline, queue for sync
    if (!navigator.onLine) {
      await offlineSyncService.queueRequest(
        'drill',
        'POST',
        `${API_BASE_URL}/hazard-drills`,
        { ...drillData, adminRole }
      );
      return { success: true, queued: true };
    }
    const errorMessage = error.response?.data?.error || error.message || 'Failed to create hazard drill';
    throw new Error(errorMessage);
  }
};

export const updateHazardDrill = async (id: string, drillData: any, adminRole: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.put(`/drills/${id}`, { ...drillData, adminRole }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating hazard drill:', error);
    // If offline, queue for sync
    if (!navigator.onLine) {
      await offlineSyncService.queueRequest(
        'drill',
        'PUT',
        `${API_BASE_URL}/drills/${id}`,
        { ...drillData, adminRole }
      );
      return { success: true, queued: true };
    }
    const errorMessage = error.response?.data?.error || error.message || 'Failed to update hazard drill';
    throw new Error(errorMessage);
  }
};

export const deleteHazardDrill = async (id: string, adminRole: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.delete(`/drills/${id}`, {
      data: { adminRole },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error deleting hazard drill:', error);
    // If offline, queue for sync
    if (!navigator.onLine) {
      await offlineSyncService.queueRequest(
        'drill',
        'DELETE',
        `${API_BASE_URL}/drills/${id}`,
        { adminRole }
      );
      return { success: true, queued: true };
    }
    const errorMessage = error.response?.data?.error || error.message || 'Failed to delete hazard drill';
    throw new Error(errorMessage);
  }
};

// ==================== EMERGENCY CONTACTS ====================

export const getEmergencyContacts = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.get('/contacts', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching emergency contacts:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url
    });
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch emergency contacts',
      contacts: []
    };
  }
};

export const createEmergencyContact = async (contactData: any, adminRole: string) => {
  return handleRequest(
    async () => {
      const response = await apiClient.post('/contacts', { ...contactData, adminRole });
      return response.data;
    },
    {
      type: 'contact',
      method: 'POST',
      endpoint: '/contacts',
      data: { ...contactData, adminRole },
    }
  );
};

export const updateEmergencyContact = async (id: string, contactData: any, adminRole: string) => {
  return handleRequest(
    async () => {
      const response = await apiClient.put(`/contacts/${id}`, { ...contactData, adminRole });
      return response.data;
    },
    {
      type: 'contact',
      method: 'PUT',
      endpoint: `/contacts/${id}`,
      data: { ...contactData, adminRole },
    }
  );
};

export const deleteEmergencyContact = async (id: string, adminRole: string) => {
  return handleRequest(
    async () => {
      const response = await apiClient.delete(`/contacts/${id}`, { data: { adminRole } });
      return response.data;
    },
    {
      type: 'contact',
      method: 'DELETE',
      endpoint: `/contacts/${id}`,
      data: { adminRole },
    }
  );
};

// ==================== FLASH SMS ALERTS ====================

export const sendFlashSMS = async (message: string, userRole: string, userId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.post('/alerts/flash-sms', {
      message,
      userRole,
      userId,
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error sending flash SMS:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to send flash SMS';
    throw new Error(errorMessage);
  }
};

export const getFlashSMSHistory = async (userRole: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.get('/alerts/flash-sms/history', {
      params: { userRole },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Handle response structure
    if (response.data && response.data.history) {
      return response.data.history;
    } else if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  } catch (error: any) {
    console.error('Error fetching alert history:', error);
    return [];
  }
};

export const getFlashSMSStatus = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.get('/alerts/flash-sms/status', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching flash SMS status:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch flash SMS status');
  }
};

export const getUserCount = async (userRole: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.get('/users/count-with-phone', {
      params: { userRole },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching user count:', error);
    return { count: 0 };
  }
};

// ==================== FISHING ZONES ====================

export const getFishingZones = async () => {
  try {
    const response = await apiClient.get('/fishing-zones');
    if (response.data && response.data.success && response.data.zones) {
      return response.data;
    }
    // Fallback to empty array if backend returns no zones
    return { success: true, zones: [] };
  } catch (error: any) {
    console.error('Error fetching fishing zones:', error);
    // Return empty array on error, frontend can handle gracefully
    return { success: false, error: error.message, zones: [] };
  }
};


export const createFishingZone = async (zoneData: {
  name: string;
  coordinates: [number, number][];
  status?: 'safe' | 'dangerous' | 'caution';
  details?: string;
}) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.post('/fishing-zones', {
      name: zoneData.name,
      coordinates: zoneData.coordinates,
      status: zoneData.status || 'safe',
      details: zoneData.details || ''
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error creating fishing zone:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to create fishing zone');
  }
};

export const updateFishingZone = async (zoneId: string, zoneData: {
  name?: string;
  coordinates?: [number, number][];
  status?: 'safe' | 'dangerous' | 'caution';
  details?: string;
}) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    // Try PUT first, fallback to PATCH if PUT doesn't exist
    try {
      const response = await apiClient.put(`/fishing-zones/${zoneId}`, zoneData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (putError: any) {
      // If PUT doesn't exist (404), update status separately and note that full update requires backend support
      if (putError.response?.status === 404) {
        // Update status if provided
        if (zoneData.status) {
          await updateFishingZoneStatus(zoneId, zoneData.status, zoneData.details);
        }
        throw new Error('Full zone update requires backend PUT endpoint. Only status can be updated for now.');
      }
      throw putError;
    }
  } catch (error: any) {
    console.error('Error updating fishing zone:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to update fishing zone');
  }
};

export const deleteFishingZone = async (zoneId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.delete(`/fishing-zones/${zoneId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error deleting fishing zone:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to delete fishing zone');
  }
};

export const updateFishingZoneStatus = async (zoneId: string, status: 'safe' | 'dangerous' | 'caution', details?: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.patch(`/fishing-zones/${zoneId}/status`, {
      status,
      details
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating fishing zone status:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to update fishing zone status');
  }
};

export const seedDefaultFishingZones = async (overwrite: boolean = false): Promise<{ success: boolean; message?: string; added?: number; updated?: number; skipped?: number; total?: number; error?: string }> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User must be authenticated');
    }

    const token = await currentUser.getIdToken();

    const response = await apiClient.post('/fishing-zones/seed-default',
      { overwrite },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error seeding default fishing zones:', error);
    if (isNetworkError(error)) {
      // Queue for offline sync if network error
      // Queue for offline sync if network error
      await offlineSyncService.queueRequest(
        'generic',
        'POST',
        `${API_BASE_URL}/fishing-zones/seed-default`,
        { overwrite }
      );
      throw new Error('Network error. Request queued for sync when online.');
    }
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to seed fishing zones'
    };
  }
};

// ==================== FISHING SPOTS ====================

export const getSafeFishingSpots = async () => {
  try {
    const response = await apiClient.get('/safe-fishing-spots');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching safe fishing spots:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch safe fishing spots',
      spots: []
    };
  }
};

export const createFishingSpot = async (spotData: any, userRole: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.post('/fishing-spots', spotData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error creating fishing spot:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to create fishing spot';
    throw new Error(errorMessage);
  }
};

export const updateFishingSpot = async (id: string, spotData: any, userRole: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.put(`/fishing-spots/${id}`, spotData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating fishing spot:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to update fishing spot';
    throw new Error(errorMessage);
  }
};

export const deleteFishingSpot = async (id: string, userRole: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.delete(`/fishing-spots/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error deleting fishing spot:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to delete fishing spot';
    throw new Error(errorMessage);
  }
};

// ==================== DONATIONS ====================

export const getDonations = async (filters?: { userId?: string, limit?: number }) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return {
        success: false,
        error: 'User not authenticated',
        donations: []
      };
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.get('/donations', {
      params: filters,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Ensure response has proper structure
    if (response.data && typeof response.data === 'object') {
      return response.data;
    }

    // Fallback for unexpected response format
    return {
      success: true,
      donations: Array.isArray(response.data) ? response.data : []
    };
  } catch (error: any) {
    console.log('Donations API unavailable:', error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch donations',
      donations: []
    };
  }
};

export const createDonation = async (donationData: any) => {
  return handleRequest(
    async () => {
      // Ensure user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const token = await currentUser.getIdToken();
      const response = await apiClient.post('/donations', donationData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    {
      type: 'donation',
      method: 'POST',
      endpoint: '/donations',
      data: donationData
    }
  );
};

// ==================== DATA EXPORT ====================

export const exportSystemData = async (type: string, format: string, range: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const token = await currentUser.getIdToken();

    const response = await apiClient.get('/admin/export-data', {
      params: { type, format, range },
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    });

    return response.data;
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};

// ==================== INFRASTRUCTURE ====================

export const getEmergencyInfrastructure = async () => {
  try {
    const response = await apiClient.get('/infrastructure');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching emergency infrastructure:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch infrastructure',
      facilities: []
    };
  }
};

export const createInfrastructure = async (data: any) => {
  return handleRequest(
    async () => {
      const response = await apiClient.post('/infrastructure', data);
      return response.data;
    },
    {
      type: 'generic',
      method: 'POST',
      endpoint: '/infrastructure',
      data,
    }
  );
};

export const updateInfrastructure = async (id: string, data: any) => {
  return handleRequest(
    async () => {
      const response = await apiClient.put(`/infrastructure/${id}`, data);
      return response.data;
    },
    {
      type: 'generic',
      method: 'PUT',
      endpoint: `/infrastructure/${id}`,
      data,
    }
  );
};

export const deleteInfrastructure = async (id: string) => {
  return handleRequest(
    async () => {
      const response = await apiClient.delete(`/infrastructure/${id}`);
      return response.data;
    },
    {
      type: 'generic',
      method: 'DELETE',
      endpoint: `/infrastructure/${id}`,
      data: null,
    }
  );
};


// Auto-identify safe fishing spots
export const autoIdentifyFishingSpots = async (region?: any) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.post('/fishing-spots/auto-identify', { region }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error auto-identifying fishing spots:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to identify fishing spots';
    throw new Error(errorMessage);
  }
};

// Verify a fishing spot
export const verifyFishingSpot = async (spotId: string, verified: boolean, notes?: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.post(`/fishing-spots/${spotId}/verify`, {
      verified,
      notes
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error verifying fishing spot:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to verify fishing spot';
    throw new Error(errorMessage);
  }
};

// ==================== CIRCULARS ====================

export const getCirculars = async () => {
  try {
    const response = await apiClient.get('/circulars');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching circulars:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch circulars',
      circulars: []
    };
  }
};

export const createCircular = async (circularData: {
  title: string;
  content: string;
  category: 'fishing' | 'safety' | 'weather' | 'regulation';
  priority: 'high' | 'medium' | 'low';
  issuedDate?: string;
  expiryDate?: string;
}, userRole: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.post('/circulars', circularData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error creating circular:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to create circular';
    throw new Error(errorMessage);
  }
};

export const updateCircular = async (id: string, circularData: {
  title?: string;
  content?: string;
  category?: 'fishing' | 'safety' | 'weather' | 'regulation';
  priority?: 'high' | 'medium' | 'low';
  issuedDate?: string;
  expiryDate?: string;
}, userRole: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.put(`/circulars/${id}`, circularData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating circular:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to update circular';
    throw new Error(errorMessage);
  }
};

export const deleteCircular = async (id: string, userRole: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.delete(`/circulars/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error deleting circular:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to delete circular';
    throw new Error(errorMessage);
  }
};

// ==================== OTP VERIFICATION ====================
export const sendOTP = async (phone: string) => {
  try {
    // Phone should be 10 digits without country code
    const phoneNumber = phone.replace(/\D/g, '').slice(0, 10);
    if (phoneNumber.length !== 10) {
      throw new Error('Invalid phone number. Please enter 10 digits.');
    }

    const response = await apiClient.post('/auth/send-otp', {
      phone: phoneNumber
    });
    return response.data;
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to send OTP'
    };
  }
};

export const verifyOTP = async (phone: string, otp: string) => {
  try {
    // Phone should be 10 digits without country code
    const phoneNumber = phone.replace(/\D/g, '').slice(0, 10);
    if (phoneNumber.length !== 10) {
      throw new Error('Invalid phone number.');
    }

    if (otp.length !== 6) {
      throw new Error('OTP must be 6 digits.');
    }

    const response = await apiClient.post('/auth/verify-otp', {
      phone: phoneNumber,
      otp: otp.replace(/\D/g, '').slice(0, 6)
    });
    return response.data;
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to verify OTP'
    };
  }
};

// ==================== DISASTER OSINT ENGINE ====================

export const getOsintAlerts = async (filters?: { platform?: string, hazardType?: string, limit?: number }) => {
  try {
    const response = await apiClient.get('/osint/alerts', { params: filters });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching OSINT alerts:', error);
    return { success: false, alerts: [], error: error.message };
  }
};

export const triggerOsintScan = async () => {
  try {
    const response = await apiClient.post('/osint/trigger');
    return response.data;
  } catch (error: any) {
    console.error('Error triggering OSINT scan:', error);
    return { success: false, error: error.message };
  }
};

export const getOsintAnalytics = async () => {
  try {
    const response = await apiClient.get('/osint/analytics');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching OSINT analytics:', error);
    return { success: false, analytics: {} };
  }
};

// ==================== END OF API SERVICE ====================





// ==================== ML MODELS ====================

export const getModels = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.get('/ai/models', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching models:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch models',
      models: []
    };
  }
};

export const getModel = async (id: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.get(`/ai/models/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching model:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch model';
    throw new Error(errorMessage);
  }
};

export const getModelInfo = async (version?: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.get('/ai/model-info', {
      params: { version },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching model info:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch model info',
      model: null
    };
  }
};

export const trainModel = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    console.log('Triggering model training...');

    const response = await apiClient.post('/ai/train-model', {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Training response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error training model:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to train model';
    throw new Error(errorMessage);
  }
};

export const testModel = async (modelId: string, text: string, context?: any) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.post(`/ai/models/${modelId}/test`, {
      text,
      context
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error testing model:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to test model';
    throw new Error(errorMessage);
  }
};

export const testModelAccuracy = async (modelId: string, testSize: number = 50) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    console.log(`Testing model accuracy for ${modelId} with testSize ${testSize}`);

    const response = await apiClient.post(`/ai/models/${modelId}/test-accuracy`, {
      testSize: testSize || 50
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Accuracy test response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error testing model accuracy:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);

    const errorMessage = error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Failed to test model accuracy';

    // Include details if available
    const errorDetails = error.response?.data?.details;
    if (errorDetails) {
      console.error('Error details:', errorDetails);
    }

    throw new Error(errorMessage);
  }
};

export const getModelMetrics = async (modelId: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.get(`/ai/models/${modelId}/metrics`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching model metrics:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch model metrics',
      metrics: null
    };
  }
};

export const getTrainingJobs = async (limit?: number) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await currentUser.getIdToken();
    const response = await apiClient.get('/ai/training-jobs', {
      params: { limit },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching training jobs:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch training jobs',
      jobs: []
    };
  }
};


// ==================== RESTORED FUNCTIONS ====================

// Reports (Missing functions)
export const getReport = async (id: string) => {
  const response = await apiClient.get(`/reports/${id}`);
  return response.data;
};
export const createReport = async (data: any) => {
  const response = await apiClient.post('/reports', data);
  return response.data;
};
export const updateReport = async (id: string, data: any) => {
  const response = await apiClient.put(`/reports/${id}`, data);
  return response.data;
};
export const deleteReport = async (id: string) => {
  const response = await apiClient.delete(`/reports/${id}`);
  return response.data;
};
export const getReportStats = async () => {
  const response = await apiClient.get('/reports/stats');
  return response.data;
};

// Export all functions as default export (must be at end of file after all function definitions)
export const chatWithBot = async (message: string, history: any[] = []) => {
  try {
    const response = await apiClient.post('/ai/chat', { message, history });
    return response.data;
  } catch (error: any) {
    console.error('Error chatting with bot:', error);
    return {
      success: false,
      response: "I'm having trouble connecting to the server. Please check your internet connection."
    };
  }
};



export const getDrills = async () => {
  try {
    const response = await apiClient.get('/drills');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching drills:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to fetch drills',
      drills: []
    };
  }
};

// ==================== IMPACT REPORTS ====================

export const submitImpactReport = async (data: any) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const token = await currentUser.getIdToken();
    const response = await apiClient.post('/impact-reports', data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error submitting impact report:', error);
    if (isNetworkError(error)) {
      await offlineSyncService.queueRequest('report', 'POST', `${API_BASE_URL}/impact-reports`, data);
      return { success: true, queued: true, message: 'Report queued for offline sync' };
    }
    throw error;
  }
};

export const getImpactReports = async (filters?: any) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const token = await currentUser.getIdToken();
    const response = await apiClient.get('/impact-reports', {
      params: filters,
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching impact reports:', error);
    return { success: false, reports: [] };
  }
};

// ==================== RESOURCE REQUESTS ====================

export const createResourceRequest = async (data: any) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const token = await currentUser.getIdToken();
    const response = await apiClient.post('/resource-requests', data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error creating resource request:', error);
    if (isNetworkError(error)) {
      await offlineSyncService.queueRequest('generic', 'POST', `${API_BASE_URL}/resource-requests`, data);
      return { success: true, queued: true, message: 'Request queued for offline sync' };
    }
    throw error;
  }
};

export const getResourceRequests = async (filters?: any) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const token = await currentUser.getIdToken();
    const response = await apiClient.get('/resource-requests', {
      params: filters,
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching resource requests:', error);
    return { success: false, requests: [] };
  }
};

export const updateResourceRequestStatus = async (id: string, status: string, notes?: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    const token = await currentUser.getIdToken();
    const response = await apiClient.patch(`/resource-requests/${id}/status`, { status, notes }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating resource request:', error);
    throw error;
  }
};

// Database Seeding
export const seedDatabase = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');

    const token = await currentUser.getIdToken();
    const response = await apiClient.post('/admin/seed-defaults', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error seeding database:', error);
    throw error;
  }
};

export default {
  // Auth
  // Auth removed (handled by AuthContext)

  // Reports
  seedDatabase,
  verifyReport,
  rejectReport,
  solveReport,
  reanalyzeReport,
  getReports,
  getReport,

  getReportStats,
  exportSystemData,

  // Impact Reports
  submitImpactReport,
  getImpactReports,

  // Resource Requests
  createResourceRequest,
  getResourceRequests,
  updateResourceRequestStatus,


  // Volunteers
  registerVolunteer,
  getVolunteers,
  updateVolunteerStatus,

  // Users
  createUser,
  getUsers,
  updateUserRole,
  deleteUser,
  blockUser,

  // AI Chat
  chatWithBot,

  // Dashboard
  getDashboardAnalytics,

  // Social Media
  processSocialMediaPosts,
  monitorSocialMedia,
  getSocialMediaReports,
  getMonitoringStatus,
  testSocialMediaServices,
  verifySocialMediaPost,

  // Notifications
  sendEmailNotification,
  sendPushNotification,
  sendDailyDigests,

  // Hazard Drills
  getHazardDrills,
  createHazardDrill,
  updateHazardDrill,
  deleteHazardDrill,

  // Emergency Contacts
  getEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,


  // Flash SMS
  sendFlashSMS,
  getFlashSMSHistory,
  getFlashSMSStatus,
  getUserCount,

  // Circulars
  getCirculars,
  createCircular,
  updateCircular,
  deleteCircular,

  // ML Models
  getModels,
  getModel,
  getModelInfo,
  trainModel,
  testModel,
  testModelAccuracy,
  getModelMetrics,
  getTrainingJobs,
  getHazardPredictions,

  // Data Fetchers
  getDonations,
  getEmergencyInfrastructure,
  getDrills,

  // INCOIS Data
  fetchINCOISData,

  // Verification
  getVerificationData,

  // OTP
  // OTP functions handled by AuthContext
};

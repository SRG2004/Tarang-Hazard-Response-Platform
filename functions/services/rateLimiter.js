/**
 * Rate Limiter Service for Weatherstack API
 * Tracks API calls per month and enforces 95 calls/month limit
 */

const admin = require('firebase-admin');

const RATE_LIMIT_COLLECTION = 'api_rate_limits';
const WEATHERSTACK_RATE_LIMIT = 95; // Max calls per month
const MONTH_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

/**
 * Get current month key (YYYY-MM format)
 */
function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Check if we can make an API call (within rate limit)
 * @returns {Promise<{allowed: boolean, remaining: number, current: number}>}
 */
async function checkRateLimit() {
  try {
    const db = admin.firestore();
    const monthKey = getCurrentMonthKey();
    const docRef = db.collection(RATE_LIMIT_COLLECTION).doc('weatherstack');
    
    const doc = await docRef.get();
    
    if (!doc.exists) {
      // First call this month
      return {
        allowed: true,
        remaining: WEATHERSTACK_RATE_LIMIT - 1,
        current: 0,
        month: monthKey
      };
    }
    
    const data = doc.data();
    const currentMonth = data.month || monthKey;
    
    // If it's a new month, reset count
    if (currentMonth !== monthKey) {
      return {
        allowed: true,
        remaining: WEATHERSTACK_RATE_LIMIT - 1,
        current: 0,
        month: monthKey
      };
    }
    
    const currentCount = data.count || 0;
    const remaining = WEATHERSTACK_RATE_LIMIT - currentCount;
    
    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining - 1),
      current: currentCount,
      month: monthKey
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // On error, allow the call (fail open)
    return {
      allowed: true,
      remaining: WEATHERSTACK_RATE_LIMIT,
      current: 0,
      error: error.message
    };
  }
}

/**
 * Record an API call
 * @returns {Promise<{success: boolean, count: number, remaining: number}>}
 */
async function recordApiCall() {
  try {
    const db = admin.firestore();
    const monthKey = getCurrentMonthKey();
    const docRef = db.collection(RATE_LIMIT_COLLECTION).doc('weatherstack');
    
    const doc = await docRef.get();
    const data = doc.exists ? doc.data() : {};
    const currentMonth = data.month || monthKey;
    
    // If it's a new month, reset count
    let count = 1;
    if (currentMonth === monthKey && data.count !== undefined) {
      count = data.count + 1;
    }
    
    await docRef.set({
      month: monthKey,
      count: count,
      lastCall: admin.firestore.FieldValue.serverTimestamp(),
      limit: WEATHERSTACK_RATE_LIMIT,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    const remaining = WEATHERSTACK_RATE_LIMIT - count;
    
    return {
      success: true,
      count: count,
      remaining: Math.max(0, remaining)
    };
  } catch (error) {
    console.error('Error recording API call:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get current rate limit status
 * @returns {Promise<{count: number, remaining: number, month: string, limit: number}>}
 */
async function getRateLimitStatus() {
  try {
    const db = admin.firestore();
    const monthKey = getCurrentMonthKey();
    const docRef = db.collection(RATE_LIMIT_COLLECTION).doc('weatherstack');
    
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return {
        count: 0,
        remaining: WEATHERSTACK_RATE_LIMIT,
        month: monthKey,
        limit: WEATHERSTACK_RATE_LIMIT
      };
    }
    
    const data = doc.data();
    const currentMonth = data.month || monthKey;
    
    // If it's a new month, reset count
    if (currentMonth !== monthKey) {
      return {
        count: 0,
        remaining: WEATHERSTACK_RATE_LIMIT,
        month: monthKey,
        limit: WEATHERSTACK_RATE_LIMIT
      };
    }
    
    const count = data.count || 0;
    const remaining = WEATHERSTACK_RATE_LIMIT - count;
    
    return {
      count: count,
      remaining: Math.max(0, remaining),
      month: monthKey,
      limit: WEATHERSTACK_RATE_LIMIT,
      lastCall: data.lastCall?.toDate?.()?.toISOString()
    };
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    return {
      count: 0,
      remaining: WEATHERSTACK_RATE_LIMIT,
      month: getCurrentMonthKey(),
      limit: WEATHERSTACK_RATE_LIMIT,
      error: error.message
    };
  }
}

module.exports = {
  checkRateLimit,
  recordApiCall,
  getRateLimitStatus,
  WEATHERSTACK_RATE_LIMIT
};


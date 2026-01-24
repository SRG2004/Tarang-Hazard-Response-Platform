/**
 * Weather API Routes
 * Includes rate limit status endpoint
 */

const express = require('express');
const router = express.Router();
const weatherService = require('../services/weatherService');
const rateLimiter = require('../services/rateLimiter');
const { verifyAuth } = require('../middleware/auth');

/**
 * GET /api/weather/rate-limit
 * Get current rate limit status for Weatherstack API
 */
router.get('/rate-limit', verifyAuth, async (req, res) => {
  try {
    const status = await rateLimiter.getRateLimitStatus();
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;


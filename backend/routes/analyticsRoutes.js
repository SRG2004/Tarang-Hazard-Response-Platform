const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyAuth } = require('../middleware/auth');

router.get('/dashboard-analytics', verifyAuth, analyticsController.getDashboardAnalytics);

module.exports = router;

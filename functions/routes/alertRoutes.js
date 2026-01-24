const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

// Send Flash SMS
router.post('/flash-sms', alertController.sendFlashSMS);

// Get Alert History
router.get('/flash-sms/history', alertController.getAlertHistory);

// Get SMS Service Status
router.get('/flash-sms/status', alertController.getSMSStatus);

module.exports = router;

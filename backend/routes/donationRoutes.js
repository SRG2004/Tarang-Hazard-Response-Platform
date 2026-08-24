const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');

router.get('/', donationController.getDonations);
router.post('/process', donationController.processDonation);

module.exports = router;

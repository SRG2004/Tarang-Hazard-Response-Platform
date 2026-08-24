const express = require('express');
const router = express.Router();
const impactController = require('../controllers/impactController');
const { verifyAuth } = require('../middleware/auth');

router.get('/', verifyAuth, impactController.getImpactReports);
router.post('/', verifyAuth, impactController.createImpactReport);

module.exports = router;

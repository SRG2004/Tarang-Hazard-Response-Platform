const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const { verifyAuth } = require('../middleware/auth');

router.get('/', verifyAuth, resourceController.getResourceRequests);
router.post('/', verifyAuth, resourceController.createResourceRequest);
router.patch('/:id/status', verifyAuth, resourceController.updateResourceRequestStatus);

module.exports = router;

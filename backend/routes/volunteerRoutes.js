const express = require('express');
const router = express.Router();
const volunteerController = require('../controllers/volunteerController');

const { verifyAuth } = require('../middleware/auth');

router.get('/', verifyAuth, volunteerController.getVolunteers);
router.post('/register', volunteerController.registerVolunteer);
router.patch('/:id/status', verifyAuth, volunteerController.updateVolunteerStatus);

module.exports = router;

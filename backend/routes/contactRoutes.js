const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { verifyAuth } = require('../middleware/auth');

router.get('/', contactController.getContacts);
router.post('/', verifyAuth, contactController.createContact);
router.put('/:id', verifyAuth, contactController.updateContact);
router.delete('/:id', verifyAuth, contactController.deleteContact);

module.exports = router;

const express = require('express');
const router = express.Router();
const infrastructureController = require('../controllers/infrastructureController');
const { verifyAuth } = require('../middleware/auth');

router.get('/', infrastructureController.getInfrastructure);
router.post('/', verifyAuth, infrastructureController.createInfrastructure);
router.put('/:id', verifyAuth, infrastructureController.updateInfrastructure);
router.delete('/:id', verifyAuth, infrastructureController.deleteInfrastructure);

module.exports = router;

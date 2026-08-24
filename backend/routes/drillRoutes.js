const express = require('express');
const router = express.Router();
const drillController = require('../controllers/drillController');
const { verifyAuth } = require('../middleware/auth');

// Note: /drills GET is unauthenticated in server.js but I will add verifyAuth to everything except maybe GET if that was intended.
// Wait, in server.js, app.get('/drills') DOES NOT have verifyAuth. 
// app.post('/drills', verifyAuth) DOES. Let's keep that behavior.

router.get('/', drillController.getDrills);
router.post('/', verifyAuth, drillController.createDrill);
router.put('/:id', verifyAuth, drillController.updateDrill);
router.delete('/:id', verifyAuth, drillController.deleteDrill);

module.exports = router;

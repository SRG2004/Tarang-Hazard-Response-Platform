const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// All routes are mounted at /users in server.js
// so these are relative to /users

// Need verifyAuth middleware
// We'll require it from server.js or abstract it.
// Actually, it's better to mount verifyAuth in server.js on the whole router:
// app.use('/users', verifyAuth, userRoutes);

router.get('/count', userController.getUserCount);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.patch('/:id/role', userController.updateUserRole);
router.delete('/:id', userController.deleteUser);
router.patch('/:id/block', userController.blockUser);

module.exports = router;

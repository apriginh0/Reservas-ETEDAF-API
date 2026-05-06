const express = require('express');
const userController = require('../controllers/userController');
const { adminOnly, authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/pending', authenticate, adminOnly, userController.getPendingUsers);
router.put('/approve/:id', authenticate, adminOnly, userController.approveUser);
router.delete('/reject/:id', authenticate, adminOnly, userController.rejectUser);
router.get('/approved', authenticate, adminOnly, userController.getApprovedUsers);
router.put('/change-role/:id', authenticate, adminOnly, userController.changeUserRole);
router.get('/approved-teachers', authenticate, userController.getApprovedTeachers);

module.exports = router;

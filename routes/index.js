const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const classReservationsRoutes = require('./class_reservationsRoutes');
const salasRoutes = require('./salasRoutes');
const userRoutes = require('./userRoutes');

router.use('/api/auth', authRoutes);
router.use('/api/class_reservations', classReservationsRoutes);
router.use('/api/', salasRoutes);
router.use('/api/users', userRoutes);

module.exports = router;

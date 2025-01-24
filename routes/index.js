const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const classReservationsRoutes = require('./class_reservationsRoutes');
const salasRoutes = require('./salasRoutes');
const userRoutes = require('./userRoutes');

router.use('/auth', authRoutes);
router.use('/class_reservations', classReservationsRoutes);
router.use('/salas', salasRoutes);
router.use('/users', userRoutes);

module.exports = router;

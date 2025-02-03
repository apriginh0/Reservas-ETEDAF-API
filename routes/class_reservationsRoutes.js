const express = require('express');
const router = express.Router();
const {
  createReservation,
  getAllReservations,
  deleteReservation,
  updateReservation,
} = require('../controllers/class_reservationsController'); // Importa o controlador de reservas
const { protect } = require('../middleware/authMiddleware'); // Importa o middleware de autenticação
const { authenticateToken } = require('../middleware/authMiddleware');

// Rota para criar uma nova reserva
router.post('/', authenticateToken, createReservation);

// Rota para listar todas as reservas
router.get('/', authenticateToken, getAllReservations);

// Rota para excluir uma reserva
router.delete('/:id', authenticateToken, deleteReservation);

// Rota para excluir uma reserva
router.put('/:id', authenticateToken, updateReservation);

module.exports = router;


const express = require('express');
const router = express.Router();
const {
  createReservation,
  getAllReservations,
  deleteReservation,
  updateReservation,
} = require('../controllers/class_reservationsController'); // Importa o controlador de reservas
const { authenticate } = require('../middleware/authMiddleware'); // Importa o middleware de autenticação

// Rota para criar uma nova reserva
router.post('/', authenticate, createReservation);

// Rota para listar todas as reservas
router.get('/', authenticate, getAllReservations);

// Rota para excluir uma reserva
router.delete('/:id', authenticate, deleteReservation);

// Rota para excluir uma reserva
router.put('/:id', authenticate, updateReservation);

module.exports = router;


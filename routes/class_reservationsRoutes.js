const express = require('express');
const router = express.Router();
const {
  createReservation,
  getAllReservations,
} = require('../controllers/class_reservationsController'); // Importa o controlador de reservas
const { protect } = require('../middleware/authMiddleware'); // Importa o middleware de autenticação

// Rota para criar uma nova reserva
router.post('/', createReservation);

// Rota para listar todas as reservas
router.get('/', getAllReservations);

module.exports = router;


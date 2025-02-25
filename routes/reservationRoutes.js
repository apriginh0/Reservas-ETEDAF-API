const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/reservations', authenticate, (req, res) => {
  res.json({ message: `Olá ${req.user.role}, suas reservas estão aqui!` });
});

module.exports = router;

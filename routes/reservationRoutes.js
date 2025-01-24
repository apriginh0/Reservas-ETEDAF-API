const express = require('express');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/reservations', protect, (req, res) => {
  res.json({ message: `Olá ${req.user.role}, suas reservas estão aqui!` });
});

module.exports = router;

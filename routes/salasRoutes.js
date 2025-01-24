const express = require('express');
const router = express.Router();
const { getClasses } = require('../controllers/classController'); // Importa o controlador de salas

router.get('/salas', getClasses); // Define a rota para buscar salas

module.exports = router;



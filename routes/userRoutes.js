const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Rota para obter usuários pendentes (approved = 0)
router.get('/pending', userController.getPendingUsers);

// Rota para aprovar um usuário (mudar approved para 1)
router.put('/approve/:id', userController.approveUser);

// Rota para rejeitar (excluir) um usuário
router.delete('/reject/:id', userController.rejectUser);

// Rota para obter usuários aprovados (approved = 1)
router.get('/approved', userController.getApprovedUsers);

// Rota para alterar o papel do usuário (role)
router.put('/change-role/:id', userController.changeUserRole);

// Rota para obter todos os professores aprovados
router.get('/approved-teachers', userController.getApprovedTeachers);


module.exports = router;

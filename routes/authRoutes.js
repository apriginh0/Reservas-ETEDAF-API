const express = require('express');
const { authenticate, adminOnly } = require('../middleware/authMiddleware'); // Importa o middleware
const authController = require('../controllers/authController');
const { register, loginUser, updateUser, forgotPassword, refreshToken, logout } = require('../controllers/authController');
const nodemailer = require('nodemailer');

const router = express.Router();

// Rotas públicas
router.post('/register', register);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword); // Rota para recuperar senha
router.post('/refresh-token', refreshToken); // Nova rota para refresh token
router.post('/logout', authenticate, logout);

// Rota do usuário autenticado
router.get('/me', authenticate, authController.getCurrentUser);
// Rota protegida
router.get('/profile', authenticate, (req, res) => {
   res.json({ message: 'Acesso autorizado!', user: req.user });
 });
// Rota protegida (apenas admin)
router.put('/update-user', authenticate, adminOnly, updateUser);

// Rota para teste de envio de e-mail
router.post('/test-email', authenticate, async (req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: req.body.email,
      subject: 'Teste de e-mail',
      text: 'Este é um teste de envio de e-mail via Nodemailer com Outlook.',
    });

    res.status(200).json({ message: 'E-mail enviado com sucesso!', info });
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    res.status(500).json({ message: 'Erro ao enviar e-mail', error });
  }
});


module.exports = router;

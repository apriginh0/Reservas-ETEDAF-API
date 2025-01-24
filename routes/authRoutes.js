const express = require('express');
const { protect } = require('../middleware/authMiddleware'); // Importa o middleware
const { register, loginUser, updateUser } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const nodemailer = require('nodemailer');

const router = express.Router();

router.post('/register', register);
router.post('/login', loginUser);

// Rota protegida
router.get('/profile', protect, (req, res) => {
   res.json({ message: 'Acesso autorizado!', user: req.user });
 });
// Rota protegida (apenas admin)
router.put('/update-user', authenticateToken, updateUser);

// Rota para recuperar senha
const { forgotPassword } = require('../controllers/authController');
router.post('/forgot-password', forgotPassword);

// Rota para teste de envio de e-mail
router.post('/test-email', async (req, res) => {
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

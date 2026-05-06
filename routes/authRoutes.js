const express = require('express');
const nodemailer = require('nodemailer');
const { authenticate, adminOnly } = require('../middleware/authMiddleware');
const {
  loginUser,
  register,
  updateUser,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  getCurrentUser,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);
router.post('/logout', authenticate, logout);

router.get('/me', authenticate, getCurrentUser);
router.get('/profile', authenticate, (req, res) => {
  res.json({ message: 'Acesso autorizado!', user: req.user });
});
router.put('/update-user', authenticate, adminOnly, updateUser);

router.post('/test-email', authenticate, adminOnly, async (req, res) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(503).json({ message: 'Serviço de e-mail indisponível.' });
  }

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

    return res.status(200).json({ message: 'E-mail enviado com sucesso!', info });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao enviar e-mail' });
  }
});

module.exports = router;

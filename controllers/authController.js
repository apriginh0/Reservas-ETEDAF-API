const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('../models/User'); // Importa o modelo User
const db = require('../config/dbTurso'); // Conexão com o banco de dados
const nodemailer = require('nodemailer');
require('dotenv').config(); // Para acessar o JWT_SECRET do .env

// Gera tokens e armazena refresh token
const generateTokens = async (user) => {
  // Access Token (15 minutos)
  const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
  );

  // Refresh Token (7 dias)
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Armazena hash do refresh token
  await db.execute({
      sql: 'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      args: [user.id, await bcrypt.hash(refreshToken, 10), expiresAt.toISOString()]
  });

  return { accessToken, refreshToken };
};

// Login Controller
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Buscar usuário no banco de dados
    const query = 'SELECT * FROM users WHERE email = ?';
    const result = await db.execute({
      sql: query,
      args: [email]});
    const user = result.rows[0]; // Pegar a primeira linha do resultado

    // Verificar se o usuário existe
    if (!user || user.approved !== 1 || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Credenciais inválidas ou conta aguardando autorização' });
    }

    // Comparar senha usando bcrypt
    const { accessToken, refreshToken } = await generateTokens(user);

    // Configura cookie seguro
    res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 15 * 60 * 1000 // 15 minutos
    });

    res.status(200).json({
        message: 'Login bem-sucedido!',
        refreshToken, // Enviado apenas uma vez via corpo
        user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Erro no login:', error.message);
    res.status(500).json({ message: 'Erro ao efetuar login', error: error.message });
  }
};

// Novo endpoint para refresh token
const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  try {
      // Busca token no banco
      const hashedToken = await bcrypt.hash(refreshToken, 10);
      const tokenResult = await db.execute({
          sql: `SELECT * FROM refresh_tokens
                WHERE token = ? AND expires_at > datetime('now')`,
          args: [hashedToken]
      });

      const dbToken = tokenResult.rows[0];
      if (!dbToken) throw new Error('Refresh token inválido');

      // Revoga token usado
      await db.execute({
          sql: 'DELETE FROM refresh_tokens WHERE id = ?',
          args: [dbToken.id]
      });

      // Gera novos tokens
      const userResult = await db.execute({
          sql: 'SELECT * FROM users WHERE id = ?',
          args: [dbToken.user_id]
      });
      const user = userResult.rows[0];

      const newTokens = await generateTokens(user);

      // Atualiza cookie
      res.cookie('access_token', newTokens.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Strict',
          maxAge: 15 * 60 * 1000
      });

      res.json({ refreshToken: newTokens.refreshToken });

  } catch (error) {
      console.error('Erro ao renovar token:', error);
      res.status(401).json({ message: 'Sessão expirada, faça login novamente' });
  }
};


// Registro de usuário (exemplo simples)
const register = async (req, res) => {
   const { name, email, password } = req.body;

   try {
     // Verificar se o usuário já existe no banco

     const userExists = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

     if (userExists.rows.length > 0) {
       return res.status(400).json({ message: 'Usuário já existe' });
     }

     // Hash da senha usando bcrypt
     const hashedPassword = await User.hashPassword(password);

     // Inserir o novo usuário no banco
     await db.execute({
       sql: `INSERT INTO users (name, email, password, role, approved) VALUES (?, ?, ?, ?,?)`,
       args: [name, email, hashedPassword, 'teacher', 0], // Definindo 'teacher' como role padrão
     });

     res.status(201).json({ message: 'Usuário registrado com sucesso' });
   } catch (error) {
     console.error('Erro ao registrar usuário:', error.message);
     res.status(500).json({ message: 'Erro ao registrar usuário', error: error.message });
   }
 };

 // Atualizar usuário (apenas para admin)
const updateUser = async (req, res) => {
   const { userId, approved, role } = req.body; // Dados recebidos
   const adminId = req.user.id; // Usuário autenticado (deve ser admin)

   try {
     // Buscar o usuário autenticado no banco
     const adminQuery = 'SELECT role FROM users WHERE id = ?';
     const adminResult = await db.execute({ sql: adminQuery, args: [adminId] });

     if (adminResult.rows[0]?.role !== 'admin') {
       return res.status(403).json({ message: 'Acesso negado. Permissão de administrador necessária.' });
     }

     // Atualizar o usuário especificado
     const updateQuery = 'UPDATE users SET approved = ?, role = ? WHERE id = ?';
     await db.execute({ sql: updateQuery, args: [approved, role, userId] });

     res.status(200).json({ message: 'Usuário atualizado com sucesso.' });
   } catch (error) {
     res.status(500).json({ message: 'Erro ao atualizar usuário', error: error.message });
   }
 };

 const getCurrentUser = async (req, res) => {
  try {
    // Modifique a query para usar a sintaxe do Turso
    const result = await db.execute({
      sql: 'SELECT id, name, email, role FROM users WHERE id = ?',
      args: [req.user.id]
    });

    // Verifique se o usuário existe
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]); // Retorna os dados do usuário
  } catch (error) {
    console.error('Erro no getCurrentUser:', error);
    res.status(500).json({ message: 'Erro interno ao buscar usuário' });
  }
};

// Enviar e-mail de redefinição de senha
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Verificar se o e-mail existe no banco de dados
    const query = 'SELECT * FROM users WHERE email = ?';
    const result = await db.execute({ sql: query, args: [email] });
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Adicione um e-mail válido.' });
    }

    // Gerar token de redefinição de senha
    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Configurar transporte de e-mail
    const transporter = nodemailer.createTransport({
      host: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Configure no .env
        pass: process.env.EMAIL_PASS, // Configure no .env
      },
    });

    // Enviar e-mail de redefinição de senha
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Redefinição de senha',
      text: `Clique no link para redefinir sua senha: ${resetLink}`,
    });

    res.status(200).json({ message: 'E-mail de redefinição de senha enviado com sucesso.' });
  } catch (error) {
    console.error('Erro ao enviar e-mail de redefinição:', error);
    res.status(500).json({ message: 'Erro ao processar a solicitação.' });
  }
};

const revokeTokens = async (userId) => {
  await db.execute({
      sql: 'DELETE FROM refresh_tokens WHERE user_id = ?',
      args: [userId]
  });
};

// Novo método de logout
const logout = async (req, res) => {
  try {
      await revokeTokens(req.user.id);
      res.clearCookie('access_token');
      res.status(200).json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
      res.status(500).json({ message: 'Erro ao fazer logout' });
  }
};

 // Exportar todas as funções
 module.exports = {
  loginUser,
  register,
  updateUser,
  forgotPassword,
  refreshToken,
  logout,
  getCurrentUser // ✅ Exportação correta
};



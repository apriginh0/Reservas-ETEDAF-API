const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Importa o modelo User
const db = require('../config/dbTurso'); // Conexão com o banco de dados
const { Resend } = require('resend'); // Importa Resend
const resend = new Resend(process.env.RESEND_API_KEY); // Inicializa com a chave do .env
require('dotenv').config(); // Para acessar o JWT_SECRET do .env

// Gera tokens e armazena refresh token
const generateTokens = async (user) => {
  // Access Token (15 minutos)
  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  console.log('Token gerado:', accessToken);

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
    console.log("Recebendo login para:", email);
    console.log("Senha recebida (usuário):", password);
    console.log("Tipo da senha recebida:", typeof password);
    // Buscar usuário no banco de dados
    const query = 'SELECT * FROM users WHERE email = ?';
    const result = await db.execute({
      sql: query,
      args: [email]
    });

    if (!result.rows.length) {
      console.log("Usuário não encontrado.");
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const user = result.rows[0]; // Pegar a primeira linha do resultado

    console.log("Usuário encontrado:", user.email);
    console.log("Senha armazenada (banco):", user.password);
    console.log("Tipo da senha armazenada:", typeof user.password);

    // Verificar se o usuário existe
    if (!user || user.approved !== 1 || !user.password) {
      return res.status(401).json({ message: 'Erro interno ao verificar credenciais' });
    }

    // Comparar senha usando bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Resultado da comparação com bcrypt:", isMatch);

    if (!isMatch) {
      console.log("Senha incorreta.");
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Comparar senha usando bcrypt
    const { accessToken, refreshToken } = await generateTokens(user);

    // Configura cookie seguro
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      domain: 'reservas-etedaf-api.onrender.com'
    });

    console.log("Login bem-sucedido para:", email);

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
      sameSite: 'None',
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
    console.log('Usuário autenticado:', req.user);
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
  console.log('--- Início forgotPassword ---');
  console.log('Email recebido:', email);

  try {
    // Verificar se o e-mail existe no banco de dados
    console.log('Buscando usuário no banco...');
    const query = 'SELECT * FROM users WHERE email = ?';
    const result = await db.execute({ sql: query, args: [email] });
    const user = result.rows[0];

    if (!user) {
      console.log('Usuário não encontrado para o email:', email);
      return res.status(400).json({ message: 'Adicione um e-mail válido.' });
    }
    console.log('Usuário encontrado:', user.id);

    // Gerar token de redefinição de senha
    console.log('Gerando token JWT...');
    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('Token gerado com sucesso.');

    // Enviar e-mail usando Resend
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log('Link de redefinição gerado:', resetLink);
    console.log('Tentando enviar e-mail via Resend...');

    const { data, error } = await resend.emails.send({
      from: 'suporte@reset.etedaf.com.br', // Domínio verificado!
      to: email,
      subject: 'Redefinição de senha - ETEDAF',
      html: `<p>Você solicitou a redefinição de sua senha.</p>
             <p>Clique no link abaixo para criar uma nova senha:</p>
             <a href="${resetLink}">${resetLink}</a>
             <p>Este link expira em 1 hora.</p>`,
    });

    if (error) {
      console.error('Erro retornado pelo Resend:', error);
      return res.status(500).json({ message: 'Erro ao enviar e-mail.', error });
    }

    console.log('E-mail enviado com sucesso via Resend. ID:', data.id);

    res.status(200).json({ message: 'E-mail de redefinição de senha enviado com sucesso.' });
  } catch (error) {
    console.error('!!! ERRO no forgotPassword !!!');
    console.error('Mensagem de erro:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: 'Erro ao processar a solicitação.', error: error.message });
  } finally {
    console.log('--- Fim forgotPassword ---');
  }
};

// Redefinir senha
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Verificar e decodificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar usuário
    const userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [decoded.id]
    });
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar senha no banco
    await db.execute({
      sql: 'UPDATE users SET password = ? WHERE id = ?',
      args: [hashedPassword, user.id]
    });

    res.status(200).json({ message: 'Senha redefinida com sucesso.' });

  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'O link de redefinição expirou.' });
    }
    res.status(500).json({ message: 'Erro ao redefinir senha.' });
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
    res.clearCookie('access_token', {
      domain: 'reservas-etedaf-api.onrender.com', // Mesmo domínio do login
      path: '/',
      secure: true,
      sameSite: 'None'
    });
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
  resetPassword,
  refreshToken,
  logout,
  getCurrentUser
};



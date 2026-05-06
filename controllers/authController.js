const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const db = require('../config/dbTurso');
const { Resend } = require('resend');
const {
  frontendUrl,
  getAccessTokenClearCookieOptions,
  getAccessTokenCookieOptions,
  getRefreshTokenExpiryDate,
  getRefreshTokenClearCookieOptions,
  jwtExpiresIn,
  jwtResetSecret,
  jwtSecret,
  refreshTokenTtlMs,
  resetTokenExpiresIn,
} = require('../config/appConfig');
const { createPasswordFingerprint, generateRefreshToken, hashRefreshToken } = require('../utils/tokenUtils');
const { toSafeUser } = require('../utils/userSerializers');

const resend = new Resend(process.env.RESEND_API_KEY);

function getRefreshTokenCookieOptions() {
  return {
    ...getAccessTokenCookieOptions(),
    maxAge: refreshTokenTtlMs,
  };
}

function signAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      pwd: createPasswordFingerprint(user.password, jwtSecret),
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
}

async function revokeTokens(userId) {
  await db.execute({
    sql: 'DELETE FROM refresh_tokens WHERE user_id = ?',
    args: [userId],
  });
}

async function generateTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = getRefreshTokenExpiryDate().toISOString();

  await db.execute({
    sql: 'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    args: [user.id, refreshTokenHash, expiresAt],
  });

  return { accessToken, refreshToken };
}

async function loginUser(req, res) {
  let { email, password } = req.body;
  email = email ? email.trim().toLowerCase() : '';

  try {
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email],
    });

    const user = result.rows[0];
    if (!user || user.approved !== 1 || !user.password) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    await revokeTokens(user.id);
    const { accessToken, refreshToken } = await generateTokens(user);

    res.cookie('access_token', accessToken, getAccessTokenCookieOptions());
    res.cookie('refresh_token', refreshToken, getRefreshTokenCookieOptions());

    return res.status(200).json({
      message: 'Login bem-sucedido!',
      user: toSafeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao efetuar login' });
  }
}

async function refreshToken(req, res) {
  const providedRefreshToken = req.cookies?.refresh_token || req.body?.refreshToken;

  if (!providedRefreshToken) {
    return res.status(401).json({ message: 'Refresh token ausente' });
  }

  try {
    const tokenHash = hashRefreshToken(providedRefreshToken);
    const tokenResult = await db.execute({
      sql: `
        SELECT id, user_id
        FROM refresh_tokens
        WHERE token = ? AND expires_at > datetime('now')
      `,
      args: [tokenHash],
    });

    const dbToken = tokenResult.rows[0];
    if (!dbToken) {
      return res.status(401).json({ message: 'Sessão expirada, faça login novamente' });
    }

    await db.execute({
      sql: 'DELETE FROM refresh_tokens WHERE id = ?',
      args: [dbToken.id],
    });

    const userResult = await db.execute({
      sql: 'SELECT id, name, email, role, approved, password FROM users WHERE id = ?',
      args: [dbToken.user_id],
    });

    const user = userResult.rows[0];
    if (!user || user.approved !== 1) {
      return res.status(401).json({ message: 'Usuário não autorizado' });
    }

    const newTokens = await generateTokens(user);

    res.cookie('access_token', newTokens.accessToken, getAccessTokenCookieOptions());
    res.cookie('refresh_token', newTokens.refreshToken, getRefreshTokenCookieOptions());

    return res.status(200).json({
      message: 'Sessão renovada com sucesso',
      user: toSafeUser(user),
    });
  } catch (error) {
    return res.status(401).json({ message: 'Sessão expirada, faça login novamente' });
  }
}

async function register(req, res) {
  let { name, email, password } = req.body;
  email = email ? email.trim().toLowerCase() : '';

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'A senha deve ter ao menos 6 caracteres' });
  }

  try {
    const userExists = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email],
    });

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Usuário já existe' });
    }

    const hashedPassword = await User.hashPassword(password);

    await db.execute({
      sql: 'INSERT INTO users (name, email, password, role, approved) VALUES (?, ?, ?, ?, ?)',
      args: [name.trim(), email, hashedPassword, 'teacher', 0],
    });

    return res.status(201).json({ message: 'Usuário registrado com sucesso' });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao registrar usuário' });
  }
}

async function updateUser(req, res) {
  const { userId, approved, role } = req.body;

  if (!userId || typeof approved === 'undefined' || !['admin', 'teacher'].includes(role)) {
    return res.status(400).json({ message: 'Dados inválidos para atualização' });
  }

  try {
    const result = await db.execute({
      sql: 'UPDATE users SET approved = ?, role = ? WHERE id = ?',
      args: [approved, role, userId],
    });

    if (!result.rowsAffected) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    return res.status(200).json({ message: 'Usuário atualizado com sucesso.' });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
}

async function getCurrentUser(req, res) {
  try {
    const result = await db.execute({
      sql: 'SELECT id, name, email, role, approved FROM users WHERE id = ?',
      args: [req.user.id],
    });

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    return res.json(toSafeUser(user));
  } catch (error) {
    return res.status(500).json({ message: 'Erro interno ao buscar usuário' });
  }
}

async function forgotPassword(req, res) {
  const rawEmail = req.body?.email || '';
  const email = rawEmail.trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ message: 'Adicione um e-mail válido.' });
  }

  try {
    const result = await db.execute({
      sql: 'SELECT id, email FROM users WHERE email = ?',
      args: [email],
    });

    const user = result.rows[0];
    if (!user) {
      return res.status(200).json({
        message: 'Se o e-mail estiver cadastrado, enviaremos um link de redefinição.',
      });
    }

    const resetToken = jwt.sign(
      { id: user.id, type: 'password_reset' },
      jwtResetSecret,
      { expiresIn: resetTokenExpiresIn }
    );

    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    const { error } = await resend.emails.send({
      from: 'suporte@reset.etedaf.com.br',
      to: email,
      subject: 'Redefinição de senha - ETEDAF',
      html: `<p>Você solicitou a redefinição de sua senha.</p>
             <p>Clique no link abaixo para criar uma nova senha:</p>
             <a href="${resetLink}">${resetLink}</a>`,
    });

    if (error) {
      return res.status(500).json({ message: 'Erro ao enviar e-mail.' });
    }

    return res.status(200).json({
      message: 'Se o e-mail estiver cadastrado, enviaremos um link de redefinição.',
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao processar a solicitação.' });
  }
}

async function resetPassword(req, res) {
  const { token, newPassword } = req.body;

  if (!token || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'Dados inválidos para redefinição de senha.' });
  }

  try {
    const decoded = jwt.verify(token, jwtResetSecret);
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ message: 'Token inválido.' });
    }

    const userResult = await db.execute({
      sql: 'SELECT id FROM users WHERE id = ?',
      args: [decoded.id],
    });

    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.execute({
      sql: 'UPDATE users SET password = ? WHERE id = ?',
      args: [hashedPassword, user.id],
    });

    await revokeTokens(user.id);
    res.clearCookie('access_token', getAccessTokenClearCookieOptions());
    res.clearCookie('refresh_token', getRefreshTokenClearCookieOptions());

    return res.status(200).json({ message: 'Senha redefinida com sucesso.' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'O link de redefinição expirou.' });
    }

    return res.status(400).json({ message: 'Token inválido.' });
  }
}

async function logout(req, res) {
  try {
    await revokeTokens(req.user.id);
    res.clearCookie('access_token', getAccessTokenClearCookieOptions());
    res.clearCookie('refresh_token', getRefreshTokenClearCookieOptions());

    return res.status(200).json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao fazer logout' });
  }
}

module.exports = {
  forgotPassword,
  getCurrentUser,
  loginUser,
  logout,
  refreshToken,
  register,
  resetPassword,
  updateUser,
};

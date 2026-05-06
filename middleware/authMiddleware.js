const jwt = require('jsonwebtoken');
const db = require('../config/dbTurso');
const {
  getAccessTokenClearCookieOptions,
  getRefreshTokenClearCookieOptions,
  jwtSecret,
} = require('../config/appConfig');
const { createPasswordFingerprint } = require('../utils/tokenUtils');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const tokenFromHeader =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;
  const token = tokenFromHeader || req.cookies?.access_token || null;

  if (!token) {
    return res.status(401).json({
      message: 'Acesso nao autorizado. Faca login.',
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const userResult = await db.execute({
      sql: 'SELECT id, role, approved, password FROM users WHERE id = ?',
      args: [decoded.id],
    });

    const user = userResult.rows[0];
    if (!user || user.approved !== 1) {
      return res.status(401).json({ message: 'Usuario nao autorizado' });
    }

    const expectedPasswordFingerprint = createPasswordFingerprint(user.password, jwtSecret);
    if (!decoded.pwd || decoded.pwd !== expectedPasswordFingerprint) {
      res.clearCookie('access_token', getAccessTokenClearCookieOptions());
      res.clearCookie('refresh_token', getRefreshTokenClearCookieOptions());
      return res.status(401).json({
        message: 'Sessao expirada. Faca login novamente.',
        errorCode: 'TOKEN_EXPIRED',
      });
    }

    req.user = {
      id: user.id,
      role: user.role,
    };

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      res.clearCookie('access_token', getAccessTokenClearCookieOptions());
      return res.status(401).json({
        message: 'Sessao expirada. Faca login novamente.',
        errorCode: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({ message: 'Token invalido' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      message: 'Acesso restrito a administradores',
    });
  }

  return next();
}

module.exports = {
  adminOnly,
  authenticate,
};

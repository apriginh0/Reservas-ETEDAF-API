const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware para validar o token JWT
const protect = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ message: 'Não autorizado, token não fornecido' });
  }

  try {
    // Remove "Bearer " do token, se presente, e verifica o token
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    req.user = decoded; // Adiciona os dados do usuário decodificado ao objeto "req"
    next(); // Continua para o próximo middleware ou rota
  } catch (error) {
    res.status(401).json({ message: 'Token inválido' });
  }
};

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de autenticação não fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Token inválido ou expirado.' });
  }
};

module.exports = { protect, authenticateToken };

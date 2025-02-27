const jwt = require('jsonwebtoken');
const db = require('../config/dbTurso');
require('dotenv').config();

// Middleware principal de autenticação (substitui protect e authenticateToken)
const authenticate = async (req, res, next) => {
    // 1. Pega o token do cookie (não mais do header)
    console.log('[AUTH] Headers:', req.headers);
    console.log('[AUTH] Cookies:', req.cookies);
    console.log('Cookies recebidos:', req.cookies); // Verifique se o token está presente
    const token = req.cookies?.access_token;

    if (!token) {
        return res.status(401).json({
            message: 'Acesso não autorizado. Faça login.'
        });
    }

    try {
        // 2. Verifica o token JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decodificado:', decoded); // Verifique o ID do usuário

        // 3. Verifica se o usuário ainda existe no banco (proteção contra tokens válidos de usuários excluídos)
        const userResult = await db.execute({
            sql: 'SELECT id, role FROM users WHERE id = ?',
            args: [decoded.id]
        });

        if (!userResult.rows[0]) {
            return res.status(401).json({ message: 'Usuário não encontrado' });
        }

        // 4. Adiciona dados do usuário à requisição
        req.user = {
            id: userResult.rows[0].id,
            role: userResult.rows[0].role
        };

        next();

    } catch (error) {
        // 5. Trata erros específicos
        console.error('Erro no middleware:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Sessão expirada. Faça login novamente.',
                errorCode: 'TOKEN_EXPIRED' // Útil para o frontend tratar
            });
        }

        res.status(401).json({ message: 'Token inválido' });
    }
};

// Middleware para restringir acesso a admins (novo)
const adminOnly = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({
            message: 'Acesso restrito a administradores'
        });
    }
    next();
};

module.exports = {
    authenticate,  // Substitui protect e authenticateToken
    adminOnly      // Novo middleware
};

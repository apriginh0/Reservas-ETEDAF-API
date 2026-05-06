const db = require('../config/dbTurso');
const { toPublicTeacher, toSafeUser } = require('../utils/userSerializers');

const ALLOWED_ROLES = new Set(['admin', 'teacher']);

exports.getPendingUsers = async (req, res) => {
  try {
    const result = await db.execute({
      sql: `
        SELECT id, name, email, role, approved
        FROM users
        WHERE approved = 0
        ORDER BY name ASC
      `,
      args: [],
    });

    res.status(200).json(result.rows.map(toSafeUser));
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários pendentes' });
  }
};

exports.approveUser = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.execute({
      sql: 'UPDATE users SET approved = 1 WHERE id = ?',
      args: [id],
    });

    if (!result.rowsAffected) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.status(200).json({ message: 'Usuário aprovado com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao aprovar usuário' });
  }
};

exports.rejectUser = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [id],
    });

    if (!result.rowsAffected) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.status(200).json({ message: 'Usuário rejeitado com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao rejeitar usuário' });
  }
};

exports.getApprovedUsers = async (req, res) => {
  try {
    const result = await db.execute({
      sql: `
        SELECT id, name, email, role, approved
        FROM users
        WHERE approved = 1
        ORDER BY name ASC
      `,
      args: [],
    });

    return res.status(200).json(result.rows.map(toSafeUser));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar usuários aprovados' });
  }
};

exports.changeUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!ALLOWED_ROLES.has(role)) {
    return res.status(400).json({ error: 'Função inválida' });
  }

  try {
    const result = await db.execute({
      sql: 'UPDATE users SET role = ? WHERE id = ?',
      args: [role, id],
    });

    if (!result.rowsAffected) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    return res.status(200).json({ message: 'Função do usuário alterada com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao alterar função do usuário' });
  }
};

exports.getApprovedTeachers = async (req, res) => {
  try {
    const result = await db.execute({
      sql: `
        SELECT id, name
        FROM users
        WHERE approved = 1
        ORDER BY name ASC
      `,
      args: [],
    });

    return res.status(200).json({ data: result.rows.map(toPublicTeacher) });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar professores' });
  }
};

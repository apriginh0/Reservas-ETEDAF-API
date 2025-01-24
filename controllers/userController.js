const db = require('../config/dbTurso'); // Conexão com o banco de dados

// Buscar usuários pendentes (approved = 0)
exports.getPendingUsers = async (req, res) => {
  try {
    const users = await db.all('SELECT * FROM users WHERE approved = 0');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários pendentes' });
  }
};

// Aprovar usuário (mudar approved para 1)
exports.approveUser = async (req, res) => {
  const { id } = req.params;
  try {
    await db.run('UPDATE users SET approved = 1 WHERE id = ?', [id]);
    res.status(200).json({ message: 'Usuário aprovado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao aprovar usuário' });
  }
};

// Rejeitar usuário (excluir do banco de dados)
exports.rejectUser = async (req, res) => {
  const { id } = req.params;
  try {
    await db.run('DELETE FROM users WHERE id = ?', [id]);
    res.status(200).json({ message: 'Usuário rejeitado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao rejeitar usuário' });
  }
};

// Buscar usuários aprovados (approved = 1)
exports.getApprovedUsers = async (req, res) => {
  try {
    const users = await db.all('SELECT * FROM users WHERE approved = 1');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários aprovados' });
  }
};

// Alterar role do usuário (teacher/admin)
exports.changeUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  try {
    await db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    res.status(200).json({ message: 'Função do usuário alterada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao alterar função do usuário' });
  }
};
